import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { validateToken } from "./auth.js";

/**
 * Event relay — mirrors Tauri's event system over WebSocket.
 *
 * The playwright-runner child process emits JSON lines on stdout.
 * This module forwards those events to connected frontend clients
 * at `/ws/events`.
 */

const clients = new Set<WebSocket>();

export function setupEventRelay(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    if (url.pathname !== "/ws/events") return;

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
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
  });
}

/**
 * Broadcast an event to all connected frontend clients.
 * Called by the invoke handlers when the playwright-runner emits events.
 */
export function broadcastEvent(
  event: string,
  payload: unknown,
): void {
  const msg = JSON.stringify({ event, payload });
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  }
}
