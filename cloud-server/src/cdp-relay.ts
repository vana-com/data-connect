import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { validateToken } from "./auth.js";

const CHROMIUM_PORT = 9222;

/**
 * CDP screencast relay.
 *
 * Connects to a Chromium page target via CDP, starts Page.startScreencast,
 * and forwards JPEG frames to connected frontend clients.
 * Receives mouse/keyboard events from clients and translates
 * them to CDP Input.dispatch*Event calls.
 *
 * Uses polling to find the connector's page target (skips about:blank
 * and chrome:// pages). Retries for up to 15 seconds to handle the case
 * where the screencast client connects before the connector creates its page.
 */

export function setupCdpRelay(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    if (url.pathname !== "/ws/screencast") return;

    const token =
      url.searchParams.get("token") ||
      req.headers.authorization?.replace("Bearer ", "");

    if (!validateToken(token || undefined)) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws) => {
    handleScreencastClient(ws);
  });
}

interface PageTarget {
  id: string;
  type: string;
  url: string;
  webSocketDebuggerUrl: string;
}

/** Fetch page targets from Chromium's CDP HTTP endpoint. */
async function getPageTargets(): Promise<PageTarget[]> {
  const res = await fetch(`http://127.0.0.1:${CHROMIUM_PORT}/json`);
  const targets = (await res.json()) as PageTarget[];
  return targets.filter(
    (t) =>
      t.type === "page" &&
      t.url !== "about:blank" &&
      !t.url.startsWith("chrome://"),
  );
}

/**
 * Poll for a non-default page target. Retries up to maxWaitMs to allow
 * the connector time to create and navigate its page.
 */
async function waitForConnectorPage(maxWaitMs = 15_000): Promise<PageTarget> {
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    const pages = await getPageTargets();
    // If there are multiple pages, prefer the last one (most recently created).
    // If there's only one non-chrome page, use it.
    if (pages.length > 0) {
      const target = pages[pages.length - 1];
      console.log(
        `[cdp-relay] Found page target: ${target.url} (${pages.length} pages total)`,
      );
      return target;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  throw new Error("No page target found after waiting");
}

async function handleScreencastClient(client: WebSocket): Promise<void> {
  let cdp: WebSocket | null = null;
  let nextId = 1;
  const pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();

  function sendCdp(
    method: string,
    params: Record<string, unknown> = {},
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!cdp || cdp.readyState !== WebSocket.OPEN) {
        reject(new Error("CDP not connected"));
        return;
      }
      const id = nextId++;
      pending.set(id, { resolve, reject });
      cdp.send(JSON.stringify({ id, method, params }));
    });
  }

  try {
    const target = await waitForConnectorPage();

    // The webSocketDebuggerUrl from Chromium may use 0.0.0.0 — normalize to 127.0.0.1
    const wsUrl = target.webSocketDebuggerUrl.replace(
      "ws://0.0.0.0:",
      "ws://127.0.0.1:",
    );
    console.log(`[cdp-relay] Connecting to: ${wsUrl}`);
    cdp = new WebSocket(wsUrl);

    await new Promise<void>((resolve, reject) => {
      cdp!.once("open", resolve);
      cdp!.once("error", reject);
    });

    console.log("[cdp-relay] Connected, starting screencast");

    cdp.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());

      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id)!;
        pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
        return;
      }

      if (msg.method === "Page.screencastFrame") {
        const { data, metadata, sessionId } = msg.params;
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "frame",
              data,
              width: metadata.deviceWidth,
              height: metadata.deviceHeight,
            }),
          );
        }
        sendCdp("Page.screencastFrameAck", { sessionId }).catch(() => {});
      }
    });

    cdp.on("close", () => {
      console.log("[cdp-relay] CDP connection closed");
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "cdp-disconnected" }));
        client.close();
      }
    });

    await sendCdp("Page.startScreencast", {
      format: "jpeg",
      quality: 80,
      maxWidth: 1280,
      maxHeight: 720,
    });

    console.log("[cdp-relay] Screencast started");

    client.on("message", (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      switch (msg.type) {
        case "mouse":
          handleMouseEvent(sendCdp, msg);
          break;
        case "keyboard":
          handleKeyboardEvent(sendCdp, msg);
          break;
        case "stop-screencast":
          sendCdp("Page.stopScreencast").catch(() => {});
          break;
      }
    });

    client.on("close", () => {
      console.log("[cdp-relay] Client disconnected");
      sendCdp("Page.stopScreencast").catch(() => {});
      cdp?.close();
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "CDP connection failed";
    console.error("[cdp-relay] Error:", message);
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "error", message }));
      client.close();
    }
    cdp?.close();
  }
}

type CdpSend = (
  method: string,
  params: Record<string, unknown>,
) => Promise<unknown>;

function handleMouseEvent(
  sendCdp: CdpSend,
  msg: Record<string, unknown>,
): void {
  const action = msg.action as string;
  const x = msg.x as number;
  const y = msg.y as number;
  const button = (msg.button as string) || "left";

  const cdpButton =
    button === "right" ? "right" : button === "middle" ? "middle" : "left";

  switch (action) {
    case "click":
      sendCdp("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x,
        y,
        button: cdpButton,
        clickCount: 1,
      })
        .then(() =>
          sendCdp("Input.dispatchMouseEvent", {
            type: "mouseReleased",
            x,
            y,
            button: cdpButton,
            clickCount: 1,
          }),
        )
        .catch(() => {});
      break;
    case "mousemove":
      sendCdp("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x,
        y,
      }).catch(() => {});
      break;
    case "mousedown":
      sendCdp("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x,
        y,
        button: cdpButton,
        clickCount: 1,
      }).catch(() => {});
      break;
    case "mouseup":
      sendCdp("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x,
        y,
        button: cdpButton,
        clickCount: 1,
      }).catch(() => {});
      break;
    case "scroll":
      sendCdp("Input.dispatchMouseEvent", {
        type: "mouseWheel",
        x,
        y,
        deltaX: (msg.deltaX as number) || 0,
        deltaY: (msg.deltaY as number) || 0,
      }).catch(() => {});
      break;
  }
}

/**
 * Key definitions ported from Puppeteer's USKeyboardLayout.
 * Maps key names to the CDP fields required by Input.dispatchKeyEvent.
 * The critical field is `keyCode` (windowsVirtualKeyCode) — without it,
 * special keys like Backspace and Delete are silently ignored by Chrome.
 */
interface KeyDef {
  keyCode: number;
  code: string;
  key: string;
  text?: string;
}

const KEY_DEFINITIONS: Record<string, KeyDef> = {
  Backspace:  { keyCode: 8,  code: "Backspace",  key: "Backspace" },
  Tab:        { keyCode: 9,  code: "Tab",         key: "Tab" },
  Enter:      { keyCode: 13, code: "Enter",       key: "Enter", text: "\r" },
  Escape:     { keyCode: 27, code: "Escape",      key: "Escape" },
  Delete:     { keyCode: 46, code: "Delete",      key: "Delete" },
  ArrowUp:    { keyCode: 38, code: "ArrowUp",     key: "ArrowUp" },
  ArrowDown:  { keyCode: 40, code: "ArrowDown",   key: "ArrowDown" },
  ArrowLeft:  { keyCode: 37, code: "ArrowLeft",   key: "ArrowLeft" },
  ArrowRight: { keyCode: 39, code: "ArrowRight",  key: "ArrowRight" },
  Home:       { keyCode: 36, code: "Home",         key: "Home" },
  End:        { keyCode: 35, code: "End",          key: "End" },
  PageUp:     { keyCode: 33, code: "PageUp",       key: "PageUp" },
  PageDown:   { keyCode: 34, code: "PageDown",     key: "PageDown" },
  Insert:     { keyCode: 45, code: "Insert",       key: "Insert" },
  F1:         { keyCode: 112, code: "F1",  key: "F1" },
  F2:         { keyCode: 113, code: "F2",  key: "F2" },
  F3:         { keyCode: 114, code: "F3",  key: "F3" },
  F4:         { keyCode: 115, code: "F4",  key: "F4" },
  F5:         { keyCode: 116, code: "F5",  key: "F5" },
  F6:         { keyCode: 117, code: "F6",  key: "F6" },
  F7:         { keyCode: 118, code: "F7",  key: "F7" },
  F8:         { keyCode: 119, code: "F8",  key: "F8" },
  F9:         { keyCode: 120, code: "F9",  key: "F9" },
  F10:        { keyCode: 121, code: "F10", key: "F10" },
  F11:        { keyCode: 122, code: "F11", key: "F11" },
  F12:        { keyCode: 123, code: "F12", key: "F12" },
};

function handleKeyboardEvent(
  sendCdp: CdpSend,
  msg: Record<string, unknown>,
): void {
  const action = msg.action as string;
  const key = msg.key as string;
  const code = msg.code as string | undefined;
  const modifiers = (msg.modifiers ?? {}) as Record<string, boolean>;

  // CDP modifier flags bitfield: 1=Alt, 2=Ctrl, 4=Meta, 8=Shift
  const modifierFlags =
    (modifiers.alt ? 1 : 0) |
    (modifiers.ctrl ? 2 : 0) |
    (modifiers.meta ? 4 : 0) |
    (modifiers.shift ? 8 : 0);

  const hasModifier = modifiers.ctrl || modifiers.meta || modifiers.alt;
  const def = KEY_DEFINITIONS[key];

  switch (action) {
    case "keyDown":
      if (def) {
        // Special key: use rawKeyDown with windowsVirtualKeyCode (required by CDP)
        sendCdp("Input.dispatchKeyEvent", {
          type: def.text ? "keyDown" : "rawKeyDown",
          key: def.key,
          code: def.code,
          windowsVirtualKeyCode: def.keyCode,
          nativeVirtualKeyCode: def.keyCode,
          text: def.text ?? "",
          unmodifiedText: def.text ?? "",
          modifiers: modifierFlags,
        }).catch(() => {});
      } else if (hasModifier) {
        // Modifier combo (Ctrl+A, Ctrl+C, etc.): dispatch as rawKeyDown
        sendCdp("Input.dispatchKeyEvent", {
          type: "rawKeyDown",
          key,
          code,
          windowsVirtualKeyCode: key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0,
          modifiers: modifierFlags,
        }).catch(() => {});
      } else if (key.length === 1) {
        // Printable character: use insertText (avoids double-char bugs)
        sendCdp("Input.insertText", { text: key }).catch(() => {});
      }
      break;
    case "keyUp":
      if (def) {
        sendCdp("Input.dispatchKeyEvent", {
          type: "keyUp",
          key: def.key,
          code: def.code,
          windowsVirtualKeyCode: def.keyCode,
          nativeVirtualKeyCode: def.keyCode,
          modifiers: modifierFlags,
        }).catch(() => {});
      } else if (hasModifier) {
        sendCdp("Input.dispatchKeyEvent", {
          type: "keyUp",
          key,
          code,
          windowsVirtualKeyCode: key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0,
          modifiers: modifierFlags,
        }).catch(() => {});
      }
      break;
    case "type": {
      // Paste: insert entire string at once
      const text = msg.text as string;
      if (text) {
        sendCdp("Input.insertText", { text }).catch(() => {});
      }
      break;
    }
  }
}
