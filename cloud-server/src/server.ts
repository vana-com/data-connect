import express from "express";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { createProxyMiddleware } from "http-proxy-middleware";
import { getAuthToken, authMiddleware } from "./auth.js";
import { setupCdpRelay } from "./cdp-relay.js";
import { setupEventRelay } from "./events.js";
import invokeRoutes from "./routes/invoke.js";

const PORT = parseInt(process.env.PORT || "3000", 10);
const NEKO_ORIGIN = process.env.NEKO_ORIGIN || "http://localhost:8080";
const STATIC_DIR =
  process.env.STATIC_DIR || path.resolve(import.meta.dirname, "../../dist");

const app = express();
const server = http.createServer(app);

// Reverse-proxy n.eko so the iframe is same-origin (fixes clipboard access)
const nekoProxy = createProxyMiddleware({
  target: NEKO_ORIGIN,
  changeOrigin: true,
  pathRewrite: { "^/neko": "" },
});
app.use("/neko", nekoProxy);

app.use(express.json({ limit: "50mb" }));
app.use("/api/invoke", authMiddleware, invokeRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/version", (_req, res) => {
  res.json({ version: "0.1.0-cloud" });
});

app.use(express.static(STATIC_DIR));

app.get("*", (_req, res) => {
  res.sendFile(path.join(STATIC_DIR, "index.html"));
});

setupEventRelay(server);
setupCdpRelay(server);

// Forward n.eko WebSocket upgrades through the proxy
server.on("upgrade", (req, socket, head) => {
  if (!(socket instanceof net.Socket)) return;
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  if (url.pathname.startsWith("/neko")) {
    nekoProxy.upgrade!(req, socket, head);
  }
});

server.listen(PORT, () => {
  const token = getAuthToken();
  console.log(`\n  Cloud Connector Runtime`);
  console.log(`  -----------------------`);
  console.log(`  Local:   http://localhost:${PORT}/?token=${token}`);
  console.log(`  Health:  http://localhost:${PORT}/health`);
  console.log(`  Token:   ${token}\n`);
});

process.on("SIGTERM", () => {
  console.log("[server] SIGTERM received, shutting down");
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  console.log("[server] SIGINT received, shutting down");
  server.close(() => process.exit(0));
});
