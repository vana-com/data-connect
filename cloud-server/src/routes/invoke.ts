import { Router, type Request, type Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import readline from "node:readline";
import { broadcastEvent } from "../events.js";

const router = Router();

interface ConnectorProcess {
  child: ChildProcess;
  runId: string;
  status: string;
}

const connectorProcesses = new Map<string, ConnectorProcess>();

const CONNECTORS_DIR =
  process.env.CONNECTORS_DIR ||
  path.resolve(import.meta.dirname, "../../connectors");

const DATA_DIR =
  process.env.DATA_DIR || path.join(process.env.HOME || "/data", "data-connect");

const PLAYWRIGHT_RUNNER =
  process.env.PLAYWRIGHT_RUNNER ||
  path.resolve(import.meta.dirname, "../../playwright-runner/index.cjs");

function timestamp(): string {
  return new Date().toISOString();
}

function sanitizePathComponent(input: string): string {
  let sanitized = input.replace(/[/\\\0]/g, "");
  sanitized = sanitized.replace(/\.\./g, "");
  sanitized = sanitized.trim();
  return sanitized || "unknown";
}

async function checkPlatforms(): Promise<unknown[]> {
  return getPlatforms();
}

function getPlatforms(): unknown[] {
  const platforms: unknown[] = [];
  const dirs = [CONNECTORS_DIR];

  const userDir = path.join(
    process.env.HOME || "/root",
    ".dataconnect",
    "connectors",
  );
  if (fs.existsSync(userDir)) dirs.push(userDir);

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const companies = fs.readdirSync(dir, { withFileTypes: true });
    for (const companyEntry of companies) {
      if (!companyEntry.isDirectory()) continue;
      const companyDir = path.join(dir, companyEntry.name);
      const files = fs.readdirSync(companyDir);
      for (const file of files) {
        if (!file.endsWith(".json") || file === "connector.json") continue;
        const filePath = path.join(companyDir, file);
        try {
          const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
          const filename = path.basename(file, ".json");
          platforms.push({
            id: content.id || `${filename}-001`,
            company: content.company || companyEntry.name,
            name: content.name,
            filename,
            description: content.description,
            isUpdated: false,
            logoURL: filename,
            needsConnection: true,
            connectURL: content.connectURL,
            connectSelector: content.connectSelector,
            exportFrequency: content.exportFrequency,
            vectorize_config: content.vectorize_config,
            runtime: content.runtime,
          });
        } catch {
          // skip unparseable metadata
        }
      }
    }
  }

  return platforms;
}

function startConnector(body: Record<string, unknown>): void {
  const runId = body.run_id as string;
  const platformId = body.platform_id as string;
  const filename = body.filename as string;
  const company = body.company as string;
  const name = body.name as string;
  const connectUrl = body.connect_url as string;

  if (connectorProcesses.has(runId)) {
    throw new Error(`Run ${runId} is already active`);
  }

  const companyLower = company.toLowerCase();
  let connectorPath = "";

  const userDir = path.join(
    process.env.HOME || "/root",
    ".dataconnect",
    "connectors",
  );
  const userPath = path.join(userDir, companyLower, `${filename}.js`);
  if (fs.existsSync(userPath)) {
    connectorPath = userPath;
  } else {
    connectorPath = path.join(CONNECTORS_DIR, companyLower, `${filename}.js`);
  }

  if (!fs.existsSync(connectorPath)) {
    throw new Error(`Connector script not found: ${connectorPath}`);
  }

  const env: Record<string, string> = { ...process.env as Record<string, string> };
  if (process.env.CDP_ENDPOINT) {
    env.CDP_ENDPOINT = process.env.CDP_ENDPOINT;
  }

  const child = spawn("node", [PLAYWRIGHT_RUNNER], {
    stdio: ["pipe", "pipe", "pipe"],
    env,
  });

  const proc: ConnectorProcess = { child, runId, status: "STARTING" };
  connectorProcesses.set(runId, proc);

  broadcastEvent("run-started", {
    runId,
    platformId,
    company,
    name,
    runtime: "playwright",
  });

  const rl = readline.createInterface({ input: child.stdout! });
  rl.on("line", (line) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }

    const msgType = msg.type as string;

    switch (msgType) {
      case "ready": {
        const runCmd = JSON.stringify({
          type: "run",
          runId,
          connectorPath,
          url: connectUrl,
          headless: true,
        });
        child.stdin!.write(runCmd + "\n");
        broadcastEvent("connector-status", {
          runId,
          status: { type: "STARTED", message: "Authorizing..." },
          timestamp: timestamp(),
        });
        break;
      }
      case "log":
        broadcastEvent("connector-log", {
          runId,
          message: msg.message,
          timestamp: timestamp(),
        });
        break;
      case "status": {
        const status = msg.status;
        if (typeof status === "string") {
          proc.status = status;
          broadcastEvent("connector-status", {
            runId,
            status: { type: status },
            timestamp: timestamp(),
          });
        } else {
          proc.status = (status as Record<string, unknown>)?.type as string || "UNKNOWN";
          broadcastEvent("connector-status", {
            runId,
            status,
            timestamp: timestamp(),
          });
        }
        break;
      }
      case "result":
        broadcastEvent("export-complete", {
          runId,
          platformId,
          company,
          name,
          data: msg.data,
          timestamp: timestamp(),
        });
        break;
      case "error":
        broadcastEvent("connector-log", {
          runId,
          message: `Error: ${msg.message}`,
          timestamp: timestamp(),
        });
        break;
      case "data":
        broadcastEvent("connector-data", {
          runId,
          key: msg.key,
          value: msg.value,
          timestamp: timestamp(),
        });
        break;
    }
  });

  const stderrRl = readline.createInterface({ input: child.stderr! });
  stderrRl.on("line", (line) => {
    console.log(`[playwright:${runId}] ${line}`);
  });

  child.on("exit", () => {
    connectorProcesses.delete(runId);
    broadcastEvent("connector-status", {
      runId,
      status: { type: "STOPPED", message: "Process ended" },
      timestamp: timestamp(),
    });
  });
}

function stopConnector(body: Record<string, unknown>): void {
  const runId = body.run_id as string;
  const proc = connectorProcesses.get(runId);
  if (!proc) return;

  try {
    proc.child.stdin!.write(JSON.stringify({ type: "quit" }) + "\n");
  } catch {
    // stdin may be closed
  }

  setTimeout(() => {
    try {
      proc.child.kill("SIGTERM");
    } catch {
      // already dead
    }
  }, 3000);
}

function getConnectorStatus(body: Record<string, unknown>): unknown {
  const runId = body.run_id as string;
  const proc = connectorProcesses.get(runId);
  if (!proc) return { running: false, status: null };
  return { running: true, status: proc.status };
}

function writeExportData(body: Record<string, unknown>): string {
  const runId = body.run_id as string;
  const platformId = body.platform_id as string;
  const company = sanitizePathComponent(body.company as string);
  const name = sanitizePathComponent(
    (body.name as string) || platformId,
  );
  const data = body.data as string;
  const ts = Math.floor(Date.now() / 1000);

  const dir = path.join(DATA_DIR, "exported_data", company, name, runId);
  fs.mkdirSync(dir, { recursive: true });

  const content = JSON.parse(data);
  const exportData = { company, name, run_id: runId, timestamp: ts, content };
  const filePath = path.join(dir, `${platformId}_${ts}.json`);
  fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));

  return filePath;
}

function loadRuns(): unknown[] {
  const dataDir = path.join(DATA_DIR, "exported_data");
  if (!fs.existsSync(dataDir)) return [];

  const runs: Array<Record<string, unknown>> = [];

  for (const companyEntry of readdirSafe(dataDir)) {
    const companyPath = path.join(dataDir, companyEntry);
    if (!fs.statSync(companyPath).isDirectory()) continue;

    for (const platformEntry of readdirSafe(companyPath)) {
      const platformPath = path.join(companyPath, platformEntry);
      if (!fs.statSync(platformPath).isDirectory()) continue;

      for (const runEntry of readdirSafe(platformPath)) {
        const runPath = path.join(platformPath, runEntry);
        if (!fs.statSync(runPath).isDirectory()) continue;

        const jsonFiles = readdirSafe(runPath).filter((f) =>
          f.endsWith(".json"),
        );
        if (jsonFiles.length === 0) continue;

        let latestFile = jsonFiles[0];
        let latestTs = 0;
        for (const f of jsonFiles) {
          const parts = path.basename(f, ".json").split("_");
          const ts = parseInt(parts[parts.length - 1], 10);
          if (ts > latestTs) {
            latestTs = ts;
            latestFile = f;
          }
        }

        try {
          const content = JSON.parse(
            fs.readFileSync(path.join(runPath, latestFile), "utf-8"),
          );
          const startDate =
            latestTs > 0
              ? new Date(latestTs * 1000).toISOString()
              : new Date().toISOString();

          runs.push({
            id: runEntry,
            platformId: platformEntry,
            filename: platformEntry,
            company: companyEntry,
            name: content.name || platformEntry,
            startDate,
            endDate: startDate,
            status: "success",
            exportPath: runPath,
            itemsExported: content.itemsExported ?? null,
            itemLabel: content.itemLabel ?? null,
            syncedToPersonalServer: content.syncedToPersonalServer ?? null,
          });
        } catch {
          // skip unparseable files
        }
      }
    }
  }

  runs.sort((a, b) =>
    (b.startDate as string).localeCompare(a.startDate as string),
  );
  return runs;
}

function readdirSafe(dir: string): string[] {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

function getServerStatus(): unknown {
  return { running: true, port: null };
}

function getAppConfig(): unknown {
  const configPath = path.join(
    process.env.HOME || "/root",
    ".dataconnect",
    "config.json",
  );
  if (!fs.existsSync(configPath)) {
    return {
      storageProvider: "local",
      serverMode: "cloud",
      selfHostedUrl: null,
    };
  }
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

function setAppConfig(body: Record<string, unknown>): void {
  const configDir = path.join(
    process.env.HOME || "/root",
    ".dataconnect",
  );
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(
    path.join(configDir, "config.json"),
    JSON.stringify(body.config, null, 2),
  );
}

const COMMAND_MAP: Record<
  string,
  (body: Record<string, unknown>) => unknown
> = {
  check_platforms: () => checkPlatforms(),
  get_platforms: () => getPlatforms(),
  start_connector_run: (b) => {
    startConnector(b);
    return { ok: true };
  },
  stop_connector: (b) => {
    stopConnector(b);
    return { ok: true };
  },
  get_connector_status: (b) => getConnectorStatus(b),
  write_export_data: (b) => writeExportData(b),
  load_runs: () => loadRuns(),
  get_server_status: () => getServerStatus(),
  get_personal_server_status: () => ({ running: false, port: null }),
  get_app_config: () => getAppConfig(),
  set_app_config: (b) => {
    setAppConfig(b);
    return { ok: true };
  },
};

router.post("/:command", (req: Request, res: Response) => {
  const command = req.params.command;
  const handler = COMMAND_MAP[command as string];

  if (!handler) {
    res.status(404).json({ error: `Unknown command: ${command}` });
    return;
  }

  try {
    const result = handler(req.body || {});

    if (result instanceof Promise) {
      result
        .then((data) => res.json(data))
        .catch((err: Error) =>
          res.status(500).json({ error: err.message }),
        );
    } else {
      res.json(result);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

export default router;
