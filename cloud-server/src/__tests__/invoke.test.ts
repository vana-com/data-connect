import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import { getAuthToken } from "../auth.js";
import invokeRoutes from "../routes/invoke.js";

describe("invoke routes", () => {
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/invoke", invokeRoutes);
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, () => resolve());
    });
    const addr = server.address() as { port: number };
    baseUrl = `http://localhost:${addr.port}`;
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("returns 404 for unknown commands", async () => {
    const res = await fetch(`${baseUrl}/api/invoke/nonexistent_command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.ok(body.error.includes("Unknown command"));
  });

  it("check_platforms returns an array", async () => {
    const res = await fetch(`${baseUrl}/api/invoke/check_platforms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body));
  });

  it("get_server_status returns running true", async () => {
    const res = await fetch(`${baseUrl}/api/invoke/get_server_status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.running, true);
  });

  it("get_app_config returns default config", async () => {
    const res = await fetch(`${baseUrl}/api/invoke/get_app_config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.storageProvider);
  });

  it("load_runs returns an array", async () => {
    const res = await fetch(`${baseUrl}/api/invoke/load_runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body));
  });
});
