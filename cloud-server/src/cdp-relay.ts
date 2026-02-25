import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { validateToken } from "./auth.js";
import { getPageDebuggerUrl } from "./chromium.js";

/**
 * CDP screencast relay.
 *
 * Connects to Chromium via CDP, starts Page.startScreencast,
 * and forwards JPEG frames to connected frontend clients.
 * Receives mouse/keyboard events from clients and translates
 * them to CDP Input.dispatch*Event calls.
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
    const debuggerUrl = await getPageDebuggerUrl();
    cdp = new WebSocket(debuggerUrl);

    await new Promise<void>((resolve, reject) => {
      cdp!.once("open", resolve);
      cdp!.once("error", reject);
    });

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
      sendCdp("Page.stopScreencast").catch(() => {});
      cdp?.close();
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "CDP connection failed";
    console.error("[cdp-relay]", message);
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

function handleKeyboardEvent(
  sendCdp: CdpSend,
  msg: Record<string, unknown>,
): void {
  const action = msg.action as string;

  switch (action) {
    case "type": {
      const text = msg.text as string;
      for (const char of text) {
        sendCdp("Input.dispatchKeyEvent", {
          type: "char",
          text: char,
        }).catch(() => {});
      }
      break;
    }
    case "keyDown":
      sendCdp("Input.dispatchKeyEvent", {
        type: "keyDown",
        key: msg.key as string,
        code: msg.code as string | undefined,
        windowsVirtualKeyCode: msg.keyCode as number | undefined,
      }).catch(() => {});
      break;
    case "keyUp":
      sendCdp("Input.dispatchKeyEvent", {
        type: "keyUp",
        key: msg.key as string,
        code: msg.code as string | undefined,
        windowsVirtualKeyCode: msg.keyCode as number | undefined,
      }).catch(() => {});
      break;
  }
}
