#!/usr/bin/env node

import http from "node:http";
import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";

const HOST = "127.0.0.1";
const PORT = Number(process.env.DATABRIDGE_DEMO_PORT || 8787);
const ROUTE = "/v1/demo/chatgpt/latest";

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  });
  res.end(JSON.stringify(body));
}

function getChatgptRootCandidates() {
  const home = homedir();
  const appDataEnv = process.env.DATABRIDGE_APP_DATA_DIR;
  const explicitRoot = process.env.DATABRIDGE_CHATGPT_ROOT;

  return [
    explicitRoot,
    appDataEnv && join(appDataEnv, "exported_data", "OpenAI", "ChatGPT"),
    join(
      home,
      "Library",
      "Application Support",
      "dev.databridge",
      "exported_data",
      "OpenAI",
      "ChatGPT",
    ),
    join(
      home,
      "Library",
      "Application Support",
      "databridge",
      "exported_data",
      "OpenAI",
      "ChatGPT",
    ),
    join(home, ".local", "share", "dev.databridge", "exported_data", "OpenAI", "ChatGPT"),
    join(home, ".local", "share", "databridge", "exported_data", "OpenAI", "ChatGPT"),
    join(
      home,
      "AppData",
      "Roaming",
      "dev.databridge",
      "exported_data",
      "OpenAI",
      "ChatGPT",
    ),
    join(home, "AppData", "Roaming", "databridge", "exported_data", "OpenAI", "ChatGPT"),
  ].filter(Boolean);
}

function resolveChatgptRoot() {
  const candidates = getChatgptRootCandidates();
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0];
}

function resolveLatestParsedFile() {
  const root = resolveChatgptRoot();
  if (!root || !existsSync(root)) {
    return null;
  }

  const runs = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const parsedPath = join(root, entry.name, "extracted", "1_parsed_conversations.json");
      if (!existsSync(parsedPath)) {
        return null;
      }
      return { parsedPath, updatedAtMs: Math.floor(statSync(parsedPath).mtimeMs) };
    })
    .filter(Boolean)
    .sort((a, b) => b.updatedAtMs - a.updatedAtMs);

  return runs[0] ?? null;
}

function handleLatest(req, res) {
  if (req.method === "OPTIONS") {
    return json(res, 204, {});
  }
  if (req.method !== "GET") {
    return json(res, 405, { ok: false, error: "Method not allowed" });
  }

  try {
    const latest = resolveLatestParsedFile();
    if (!latest) {
      return json(res, 404, { ok: false, error: "No ChatGPT parsed export found" });
    }

    const raw = readFileSync(latest.parsedPath, "utf-8");
    const data = JSON.parse(raw);
    return json(res, 200, {
      ok: true,
      updatedAtMs: latest.updatedAtMs,
      data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json(res, 500, { ok: false, error: message });
  }
}

const server = http.createServer((req, res) => {
  const url = req.url || "/";
  if (url === "/healthz") {
    return json(res, 200, { ok: true });
  }
  if (url === ROUTE) {
    return handleLatest(req, res);
  }
  return json(res, 404, { ok: false, error: "Not found" });
});

server.listen(PORT, HOST, () => {
  process.stdout.write(
    `[demo-chatgpt-endpoint] listening on http://${HOST}:${PORT}${ROUTE}\n`,
  );
});
