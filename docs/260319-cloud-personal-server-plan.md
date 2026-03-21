# Cloud Personal Server on account.vana.org

**Date:** 2026-03-19
**Status:** Draft / RFC
**Repos:** vana-connect (primary), personal-server-ts, data-connect (reference)

## Goal

When a user logs into account.vana.org, a Personal Server is provisioned for them in the cloud. They can see its status, copy its MCP endpoint, and use it for grants. No desktop app required.

## Decisions

1. **URL scheme:** `{userId}.myvana.app` — a dedicated domain for cloud-hosted Personal Servers, following industry best practice (Vercel uses `vercel.app`, Supabase uses `supabase.co`). Existing FRP tunnels remain on `*.server.vana.org` undisturbed.
   - *Future consideration:* Unify `*.server.vana.org` (tunneled) and `*.myvana.app` (cloud) under a single domain like `{name}.server.vana`.
2. **Subdomains over paths:** The PS may serve an admin web UI in the future (like self-hosted tools such as Grafana, Portainer). Subdomains give proper origin isolation (cookies, localStorage, service workers scoped per user). Path-based routing makes this fragile.
3. **Persistent disk lifecycle:** Keep disks for 30 days after deprovision. Data survives re-provision.
4. **Gateway registration:** Auto-register with the Gateway after health check passes. No manual step.
5. **Keypair derivation:** Wallet-derived `masterKeySignature` (not server-generated) so the keypair is recoverable from the user's wallet. Passed as env var for MVP; move to GCP Secret Manager or Sprites.dev secret injection in production.
6. **Cost:** e2-micro ~$7/mo per user. Acceptable for early users. Provider abstraction exists specifically to swap to Sprites.dev MicroVMs at scale.
7. **Naming:** Use the user's ID (wallet address or Privy ID) as the subdomain, same as the existing tunnel scheme. No user-chosen names or uniqueness system needed.

8. **Routing via Cloudflare Tunnels:** Each VM runs `cloudflared` which creates an outbound tunnel to Cloudflare. The provisioning API creates a tunnel + DNS CNAME via the Cloudflare API. The VM only receives a scoped tunnel token — never the Cloudflare API key. This avoids the Worker-can't-fetch-IPs limitation, requires no proxy fleet, no per-user DNS management, and Cloudflare handles TLS.

## Architecture

```
{userId}.myvana.app
   |
   v
Cloudflare Edge (TLS termination, DDoS protection)
   |
   v
Cloudflare Tunnel (one per user, created via API)
   |  CNAME: {userId}.myvana.app → {tunnelId}.cfargotunnel.com
   |
   v
cloudflared (sidecar on GCE VM, outbound connection)
   |
   v
Personal Server container (localhost:8080)
   - Hono.js HTTP server
   - SQLite index + local data storage
   - Grant management + Gateway registration
   - MCP endpoint at /mcp

account.vana.org (Next.js on Vercel)
   |
   |  POST   /api/servers          (provision)
   |  GET    /api/servers/:id      (status)
   |  DELETE /api/servers/:id      (deprovision)
   |  GET    /api/servers          (list)
   |
   v
Provider Abstraction Layer
   |
   +-- GCPProvider      (initial: GCE micro VMs + Cloudflare Tunnel)
   +-- SpritesProvider   (future: Sprites.dev Firecracker MicroVMs)
```

### Provisioning Flow

1. API creates GCE VM with persistent data disk
2. API creates Cloudflare Tunnel via CF API → gets tunnel ID + token
3. API configures tunnel ingress: `{userId}.myvana.app` → `http://localhost:8080`
4. API creates DNS CNAME: `{userId}.myvana.app` → `{tunnelId}.cfargotunnel.com`
5. Tunnel token passed to VM as instance metadata
6. VM startup script: mount disk → run PS container → install + run cloudflared with token
7. `https://{userId}.myvana.app` is live

### Deprovision Flow

1. Delete Cloudflare Tunnel (auto-removes tunnel routes)
2. Delete DNS CNAME record
3. Stop GCE VM (persistent disk retained 30 days)

## Repos & Responsibilities

### personal-server-ts — Dockerize

The server is a Node.js monorepo (core/server/cli) using Hono, better-sqlite3, and viem.

**Work needed:**

1. **Dockerfile** — Multi-stage build:
   - Build stage: Node 20 alpine + build-base (for better-sqlite3 native addon)
   - Runtime stage: Node 20 alpine, copy dist + node_modules
   - `EXPOSE 8080`, `CMD ["node", "packages/server/dist/index.js"]`

2. **Cloud-mode config defaults:**
   - `tunnel.enabled: false` (server is directly addressable via Cloudflare Worker)
   - `devUi.enabled: false` (no browser on the VM)
   - `sync.enabled: false` (for now)
   - Accept `SERVER_ORIGIN` env var so it knows its own public URL

3. **Container registry:** Push image to Docker Hub (`vanaorg/personal-server`) via GitHub Actions CI

4. **Health check:** Already has `/health` endpoint. Add a `HEALTHCHECK` instruction.

5. **Persistent volume:** `$PERSONAL_SERVER_ROOT_PATH` (default `/data`) must be a persistent disk for `index.db`, `key.json`, `data/`, `logs/`.

**Env vars at container start:**
- `VANA_MASTER_KEY_SIGNATURE` — derived from user's wallet, used for server identity (recoverable)
- `PERSONAL_SERVER_ROOT_PATH` — `/data` (mounted persistent volume)
- `SERVER_ORIGIN` — public URL (e.g., `https://{userId}.myvana.app`)

### Cloudflare Worker — Fallback Only

A simple Worker on `*.myvana.app` that returns a friendly 404 for subdomains with no tunnel. Actual traffic routing is handled by Cloudflare Tunnels + DNS CNAMEs, not the Worker.

### vana-connect — Provisioning API + UI

The `/connect` Next.js app already has Privy auth and an `/api/sign` route. Personal server provisioning fits naturally as new API routes.

**Work needed:**

#### 1. Provider Abstraction (`connect/src/lib/server-provider/`)

```typescript
interface ServerProvider {
  provision(params: {
    userId: string
    masterKeySignature: string
    ownerAddress: string
  }): Promise<{ serverId: string; url: string }>

  status(serverId: string): Promise<{
    state: 'provisioning' | 'running' | 'stopped' | 'error'
    url?: string
    health?: { ownerAddress: string }
  }>

  deprovision(serverId: string): Promise<void>
}
```

#### 2. GCP Provider (initial implementation)

Uses GCP Compute Engine API + Cloudflare Tunnel API:
- `provision()`: Create Cloudflare Tunnel → create DNS CNAME → create GCE VM with tunnel token + persistent disk → VM runs PS container + cloudflared sidecar
- `status()`: Check VM status + hit health endpoint via the tunnel URL
- `deprovision()`: Delete Cloudflare Tunnel + DNS CNAME → stop VM, keep persistent disk for 30 days

Authentication: GCP service account key + Cloudflare API token (stored as Vercel env vars).

**Why VMs over Cloud Run:** Personal Servers are long-lived, stateful (SQLite on disk), and need to be always-addressable for MCP and grant callbacks. Cloud Run's request-based lifecycle and ephemeral filesystem make it a poor fit.

#### 3. Data Store (Neon Postgres)

Simple table mapping users to their provisioned servers:

```sql
CREATE TABLE personal_servers (
  id            TEXT PRIMARY KEY,        -- srv_ prefixed ID
  user_id       TEXT UNIQUE NOT NULL,    -- Privy user ID or wallet address
  provider      TEXT NOT NULL,           -- 'gcp' | 'sprites'
  provider_id   TEXT,                    -- GCP instance name / Sprites VM ID
  tunnel_id     TEXT,                    -- Cloudflare Tunnel ID
  dns_record_id TEXT,                    -- Cloudflare DNS CNAME record ID
  url           TEXT,                    -- public URL ({userId}.myvana.app)
  state         TEXT NOT NULL DEFAULT 'provisioning',
  disk_id       TEXT,                    -- persistent disk ID (retained 30 days after deprovision)
  disk_expires  TIMESTAMPTZ,            -- set on deprovision: now() + 30 days
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

#### 4. API Routes — Stripe-style (`connect/src/app/api/`)

Resource-oriented, consistent, predictable. The Personal Server is a first-class API resource.

```
POST   /api/servers          → Create (provision) a server for the authed user
GET    /api/servers/:id      → Retrieve server details + live status
DELETE /api/servers/:id      → Deprovision and remove
GET    /api/servers          → List servers (for now, returns the user's single server)
```

**Request/Response shape** (Stripe conventions):
- Resources have a stable `id`, `object` type, `created` timestamp
- Responses wrap in `{ "object": "server", "id": "srv_...", ... }`
- Errors: `{ "error": { "type": "invalid_request", "message": "..." } }`
- Idempotent creation: POST with same user returns existing server, not a duplicate

```typescript
// POST /api/servers — request
{ masterKeySignature: string }

// POST /api/servers — response
{
  object: "server",
  id: "srv_abc123",
  status: "provisioning",   // provisioning | running | stopped | error
  url: null,                // populated once running
  mcp_endpoint: null,       // populated once running
  owner_address: "0x...",
  provider: "gcp",
  created: 1710806400,
  updated: 1710806400
}

// GET /api/servers/srv_abc123 — response (once running)
{
  object: "server",
  id: "srv_abc123",
  status: "running",
  url: "https://{userId}.myvana.app",
  mcp_endpoint: "https://{userId}.myvana.app/mcp",
  owner_address: "0x...",
  provider: "gcp",
  created: 1710806400,
  updated: 1710806460
}
```

**Auth:** All routes recover wallet address from `masterKeySignature` header (same pattern as existing `/api/sign`). Servers are scoped to the authenticated user — you can only access your own.

#### 5. Provisioning on Login

In the connect app's auth flow, after Privy login completes:
- Call `POST /api/servers` with the user's master key signature
- If server already exists and is running, return existing (idempotent)
- Show provisioning progress in UI (polling `GET /api/servers/:id`)
- After server health check passes, auto-register with Gateway

#### 6. UI (in connect app)

Add a "Personal Server" section to the authenticated user's dashboard:
- **Status indicator:** provisioning / running / stopped / error
- **Server URL:** copyable
- **MCP endpoint:** `{serverUrl}/mcp` — copyable, with instructions for Claude Desktop
- **Actions:** Restart (deprovision + provision), or just status for now

### data-connect — Reference Only

No changes needed in data-connect for this work. Its personal server code (Tauri subprocess management, grant flow, ingest) serves as reference for how the protocol works. The vana-connect SDK's `src/personal-server/` client already has grant and ingest functionality that can be evolved.

## Execution Plan

### Phase 1: Containerize Personal Server

**Tasks:**
- [ ] Write Dockerfile for personal-server-ts (multi-stage, Node 20 alpine)
- [ ] Add `HEALTHCHECK` instruction
- [ ] Add cloud-mode env var support (`SERVER_ORIGIN`, `tunnel.enabled=false`)
- [ ] Build and test locally with `docker run`
- [ ] Push image to GCP Artifact Registry
- [ ] Document env vars and volume mount in personal-server-ts README

**Validation:**
- [ ] `docker build` completes without errors
- [ ] `docker run -p 8080:8080 -v /tmp/ps-data:/data -e VANA_MASTER_KEY_SIGNATURE=<test> -e SERVER_ORIGIN=http://localhost:8080` starts successfully
- [ ] `curl http://localhost:8080/health` returns 200 with `{ ownerAddress: "0x..." }`
- [ ] Server generates `key.json` on first boot in `/data`
- [ ] Server persists data across container restart (stop, start, check `/data/index.db` survives)
- [ ] `better-sqlite3` native addon works in alpine container (common failure point)
- [ ] Container runs with non-root user (security baseline)
- [ ] Grant flow works against containerized server: create grant via API, verify grant is stored, query granted data

### Phase 2: Cloudflare Tunnel Integration

**Tasks:**
- [ ] Verify Cloudflare API token has Tunnel:Edit + DNS:Edit permissions
- [ ] Implement tunnel creation/deletion in GCP provider via Cloudflare API
- [ ] Implement DNS CNAME creation/deletion for `{userId}.myvana.app` → `{tunnelId}.cfargotunnel.com`
- [ ] Update VM startup script to install `cloudflared` and run tunnel with token from metadata
- [ ] Deploy a simple Cloudflare Worker on `*.myvana.app` as 404 fallback for unknown subdomains

**Validation:**
- [ ] Cloudflare API: create tunnel → returns tunnel ID + token
- [ ] Cloudflare API: configure tunnel ingress → `{userId}.myvana.app` routes to `http://localhost:8080`
- [ ] Cloudflare API: create CNAME → `{userId}.myvana.app` resolves to `{tunnelId}.cfargotunnel.com`
- [ ] VM startup: `cloudflared` connects successfully using the tunnel token
- [ ] `https://{userId}.myvana.app/health` returns 200 through the tunnel
- [ ] Unknown subdomain returns friendly 404 (Worker fallback)
- [ ] Deprovision: tunnel + DNS cleaned up, subdomain stops resolving

### Phase 3: GCP Provider + API Routes

**Tasks:**
- [ ] Set up Neon Postgres database and `personal_servers` table
- [ ] Implement `ServerProvider` interface
- [ ] Implement `GCPProvider` (provision, status, deprovision)
- [ ] Implement API routes: `POST /api/servers`, `GET /api/servers/:id`, `DELETE /api/servers/:id`, `GET /api/servers`
- [ ] Add GCP service account credentials to Vercel env vars
- [ ] Wire provision flow to create Cloudflare Tunnel + DNS + GCE VM

**Validation:**
- [ ] `POST /api/servers` with valid `masterKeySignature` → returns `{ status: "provisioning" }`
- [ ] `POST /api/servers` again with same user → returns existing server (idempotent), not duplicate
- [ ] GCE VM appears in GCP console within 2 minutes of POST
- [ ] `GET /api/servers/:id` transitions from `provisioning` → `running` once VM is healthy
- [ ] `https://{userId}.myvana.app/health` returns 200 (proving Cloudflare Tunnel routes to the container)
- [ ] `https://{userId}.myvana.app/mcp` responds (MCP endpoint reachable)
- [ ] `DELETE /api/servers/:id` stops the VM, deletes tunnel + DNS, DB state → `stopped`, disk retained
- [ ] After DELETE, `https://{userId}.myvana.app` returns 404 (tunnel removed)
- [ ] Re-provision after DELETE reuses the retained disk (data survives)
- [ ] Auth: request without valid `masterKeySignature` → 401
- [ ] Auth: user A cannot access user B's server → 403
- [ ] Error handling: provision with invalid signature → clear error message
- [ ] Error handling: GCP API failure during provision → server state set to `error`, not stuck in `provisioning`

### Phase 4: Login Integration + UI

**Tasks:**
- [ ] Wire `POST /api/servers` into post-Privy-login flow
- [ ] Build server status UI (status indicator, URL, MCP endpoint)
- [ ] Add polling for provisioning → running transition
- [ ] Auto-register server with Gateway after health check passes
- [ ] Add restart action (deprovision + re-provision)

**Validation:**
- [ ] **Full user journey (happy path):** New user → Privy login → server auto-provisions → status UI shows "provisioning" → transitions to "running" → MCP endpoint displayed → copy endpoint → paste into Claude Desktop → Claude can call tools on the PS
- [ ] **Returning user:** Login → existing server detected → status shows "running" immediately (no re-provision)
- [ ] **Gateway registration:** After provision, server appears in Gateway (`GET /v1/servers` returns the cloud PS)
- [ ] **Grant flow end-to-end:** Builder app requests grant → user approves on account.vana.org → PS stores grant → builder can query data via MCP endpoint
- [ ] **Restart flow:** User clicks restart → old VM stops → new VM starts → same data (disk reused) → URL unchanged
- [ ] **Error recovery:** If VM dies (simulate by stopping it in GCP console) → status UI shows "error" → user can restart
- [ ] **Concurrent provision:** Two rapid login attempts from same user → only one server created (idempotency)
- [ ] **UI states:** Verify all status indicators render correctly: provisioning (spinner), running (green), stopped (gray), error (red)
- [ ] **MCP endpoint copy:** Clipboard copy works, copied URL is correct and reachable

### Phase 5: Sprites.dev Provider (later)

**Tasks:**
- [ ] Implement `SpritesProvider` against Sprites.dev API
- [ ] Swap provider via env var (`SERVER_PROVIDER=sprites`)
- [ ] Same interface, different backend

**Validation:**
- [ ] All Phase 3 and Phase 4 validations pass with `SERVER_PROVIDER=sprites`
- [ ] Provision time is comparable or faster than GCP
- [ ] Cost per server is lower than GCE e2-micro
- [ ] Existing cloud servers on GCP continue working (no migration needed for MVP; both providers can coexist)

## Rollback Plan

- **Phase 2 (Tunnels):** Each tunnel is independent. One tunnel failing doesn't affect others. Tunnel creation/deletion is idempotent via the Cloudflare API.
- **Phase 3 (API):** API routes are additive. If broken, disable the routes; no existing functionality affected.
- **Phase 4 (Login):** Auto-provision on login can be feature-flagged. If it causes issues, disable the flag and users see no server UI.
- **VM failure:** If a specific VM is unhealthy, the provisioning API can deprovision and re-provision. Data survives on the retained disk.
