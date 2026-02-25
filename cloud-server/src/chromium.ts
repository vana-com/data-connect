import { spawn, type ChildProcess } from "node:child_process";
import http from "node:http";

let chromiumProcess: ChildProcess | null = null;

const CHROMIUM_PORT = 9222;
const CHROMIUM_ARGS = [
  `--remote-debugging-port=${CHROMIUM_PORT}`,
  "--user-data-dir=/data/profile",
  "--no-first-run",
  "--disable-default-apps",
  "--disable-blink-features=AutomationControlled",
  "--disable-features=MediaRouter,DialMediaRouteProvider",
];

/**
 * Start a headed Chromium instance with remote debugging enabled.
 * Expects Xvfb to already be running on $DISPLAY (default :99).
 */
export function startChromium(): void {
  if (chromiumProcess) {
    console.log("[chromium] Already running");
    return;
  }

  const chromiumBin =
    process.env.CHROMIUM_BIN || "chromium-browser";
  console.log(`[chromium] Starting: ${chromiumBin}`);

  chromiumProcess = spawn(chromiumBin, CHROMIUM_ARGS, {
    stdio: "ignore",
    env: { ...process.env, DISPLAY: process.env.DISPLAY || ":99" },
  });

  chromiumProcess.on("exit", (code) => {
    console.log(`[chromium] Exited with code ${code}`);
    chromiumProcess = null;
  });
}

/** Stop the Chromium process. */
export function stopChromium(): void {
  if (!chromiumProcess) return;
  chromiumProcess.kill("SIGTERM");
  chromiumProcess = null;
}

/**
 * Poll `http://localhost:9222/json/version` until Chromium is ready.
 * Returns the `webSocketDebuggerUrl`.
 */
export async function waitForChromium(
  timeoutMs = 30_000,
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const data = await fetchJson(
        `http://localhost:${CHROMIUM_PORT}/json/version`,
      );
      if (data.webSocketDebuggerUrl) {
        console.log("[chromium] Ready");
        return data.webSocketDebuggerUrl as string;
      }
    } catch {
      // not ready yet
    }
    await sleep(500);
  }
  throw new Error("Chromium did not start in time");
}

/** Get the CDP WebSocket debugger URL for the first page target. */
export async function getPageDebuggerUrl(): Promise<string> {
  const targets = (await fetchJson(
    `http://localhost:${CHROMIUM_PORT}/json`,
  )) as unknown as Array<{ type: string; webSocketDebuggerUrl: string }>;
  const page = targets.find((t) => t.type === "page");
  if (!page) throw new Error("No page target found");
  return page.webSocketDebuggerUrl;
}

/** Get the browser-level CDP WebSocket URL from /json/version. */
export async function getBrowserDebuggerUrl(): Promise<string> {
  const data = await fetchJson(
    `http://localhost:${CHROMIUM_PORT}/json/version`,
  );
  return data.webSocketDebuggerUrl as string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchJson(url: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    http
      .get(url, { timeout: 2000 }, (res) => {
        let body = "";
        res.on("data", (chunk: Buffer) => {
          body += chunk.toString();
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}
