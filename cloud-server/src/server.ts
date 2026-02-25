import express from "express";
import http from "node:http";
import path from "node:path";
import { getAuthToken, authMiddleware } from "./auth.js";
import { setupEventRelay } from "./events.js";
import { setupCdpRelay } from "./cdp-relay.js";
import invokeRoutes from "./routes/invoke.js";

const PORT = parseInt(process.env.PORT || "3000", 10);
const STATIC_DIR =
  process.env.STATIC_DIR || path.resolve(import.meta.dirname, "../../dist");

const app = express();
const server = http.createServer(app);

app.use(express.json({ limit: "50mb" }));
app.use("/api/invoke", authMiddleware, invokeRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(express.static(STATIC_DIR));

app.get("*", (_req, res) => {
  res.sendFile(path.join(STATIC_DIR, "index.html"));
});

setupEventRelay(server);
setupCdpRelay(server);

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
