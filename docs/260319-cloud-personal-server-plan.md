# Cloud Personal Server on account.vana.org

**Date:** 2026-03-19
**Status:** Draft / RFC
**Repos:** vana-connect (primary), personal-server-ts, data-connect (reference)

## Goal

When a user logs into account.vana.org, a Personal Server is provisioned for them in the cloud. They can see its status, copy its MCP endpoint, and use it for grants. No desktop app required.

## Decisions

1. **URL scheme:** `{userId}.myvana.app` — a dedicated domain for cloud-hosted Personal Servers, following industry best practice (Vercel uses `vercel.app`, Supabase uses `supabase.co`). Existing FRP tunnels remain on `*.myvana.app` undisturbed. A Cloudflare Worker on `*.myvana.app` routes to cloud VMs via Neon DB lookup with KV cache.
   - *Future consideration:* Unify `*.myvana.app` (tunneled) and `*.myvana.app` (cloud) under a single domain once the Worker is proven. A dedicated domain like `{name}.server.vana` would be ideal.
2. **Subdomains over paths:** The PS may serve an admin web UI in the future (like self-hosted tools such as Grafana, Portainer). Subdomains give proper origin isolation (cookies, localStorage, service workers scoped per user). Path-based routing makes this fragile.
3. **Persistent disk lifecycle:** Keep disks for 30 days after deprovision. Data survives re-provision.
4. **Gateway registration:** Auto-register with the Gateway after health check passes. No manual step.
5. **Keypair derivation:** Wallet-derived `masterKeySignature` (not server-generated) so the keypair is recoverable from the user's wallet. Passed as env var for MVP; move to GCP Secret Manager or Sprites.dev secret injection in production.
6. **Cost:** e2-micro ~$7/mo per user. Acceptable for early users. Provider abstraction exists specifically to swap to Sprites.dev MicroVMs at scale.
7. **Naming:** Use the user's ID (wallet address or Privy ID) as the subdomain, same as the existing tunnel scheme. No user-chosen names or uniqueness system needed.

## Architecture

```
*.myvana.app (Cloudflare — wildcard DNS already in place)
   |
   v
Cloudflare Worker (routing layer)
   |
   +-- Cloud VM? → proxy to VM IP (looked up from Neon DB)
   +-- Otherwise → pass through to FRP origin (existing tunnel behavior)

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
   +-- GCPProvider      (initial: GCE micro VMs)
   +-- SpritesProvider   (future: Sprites.dev Firecracker MicroVMs)
   |
   v
Per-User Personal Server (personal-server-ts in Docker)
   - Hono.js HTTP server
   - SQLite index + local data storage
   - Grant management + Gateway registration
   - MCP endpoint at /mcp
   - Admin UI (future)
```

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

3. **Container registry:** Push image to GCP Artifact Registry (and later Sprites.dev registry)

4. **Health check:** Already has `/health` endpoint. Add a `HEALTHCHECK` instruction.

5. **Persistent volume:** `$PERSONAL_SERVER_ROOT_PATH` (default `/data`) must be a persistent disk for `index.db`, `key.json`, `data/`, `logs/`.

**Env vars at container start:**
- `VANA_MASTER_KEY_SIGNATURE` — derived from user's wallet, used for server identity (recoverable)
- `PERSONAL_SERVER_ROOT_PATH` — `/data` (mounted persistent volume)
- `SERVER_ORIGIN` — public URL (e.g., `https://{userId}.myvana.app`)

### Cloudflare Worker — Routing Layer

A Worker on `*.myvana.app` that unifies cloud and tunnel traffic:

1. Extract user ID from subdomain
2. Look up in Neon DB — is this a cloud-hosted server?
   - **Yes:** Proxy request to the VM's IP
   - **No:** Pass through to the FRP origin (existing behavior, zero disruption)

The Worker is the only component that knows whether a server is cloud or tunneled. Everything else (Gateway, apps, MCP clients) sees a single `{userId}.myvana.app` URL.

**Caching:** Cache the DB lookup (user ID → VM IP) with a short TTL (30-60s) to avoid hitting the DB on every request. Invalidate on provision/deprovision.

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

Uses GCP Compute Engine API to manage e2-micro VMs:
- `provision()`: Create VM from personal-server container image, attach persistent disk, set env vars, assign external IP
- `status()`: Check VM status + hit `/health`
- `deprovision()`: Stop VM, keep persistent disk for 30 days, remove routing entry

Authentication: Vercel serverless routes use a GCP service account key (stored as env var/secret).

**Why VMs over Cloud Run:** Personal Servers are long-lived, stateful (SQLite on disk), and need to be always-addressable for MCP and grant callbacks. Cloud Run's request-based lifecycle and ephemeral filesystem make it a poor fit.

#### 3. Data Store (Neon Postgres)

Simple table mapping users to their provisioned servers:

```sql
CREATE TABLE personal_servers (
  id            TEXT PRIMARY KEY,        -- srv_ prefixed ID
  user_id       TEXT UNIQUE NOT NULL,    -- Privy user ID or wallet address
  provider      TEXT NOT NULL,           -- 'gcp' | 'sprites'
  provider_id   TEXT,                    -- GCP instance name / Sprites VM ID
  vm_ip         TEXT,                    -- internal IP for Cloudflare Worker routing
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

### Phase 2: Cloudflare Worker + Routing

**Tasks:**
- [ ] Create Cloudflare Worker for `*.myvana.app`
- [ ] Worker logic: extract subdomain → check Neon DB → route to VM IP or fall through to FRP origin
- [ ] Add KV or cached DB lookup (30-60s TTL) for user ID → VM IP mapping
- [ ] Deploy Worker with FRP as default backend (zero disruption to existing tunnels)

**Validation:**
- [ ] Existing tunnel URLs (`{userId}.myvana.app`) still work after Worker deployment — test with a real tunneled PS
- [ ] Worker correctly falls through to FRP for unknown/tunnel users
- [ ] Worker returns 502/504 with useful error when a cloud VM is unreachable
- [ ] Latency overhead of Worker is <50ms (measure with `curl -w` timing)
- [ ] Cache invalidation works: provision a test entry in DB, verify Worker routes to it, delete entry, verify Worker falls back to FRP within TTL window

### Phase 3: GCP Provider + API Routes

**Tasks:**
- [ ] Set up Neon Postgres database and `personal_servers` table
- [ ] Implement `ServerProvider` interface
- [ ] Implement `GCPProvider` (provision, status, deprovision)
- [ ] Implement API routes: `POST /api/servers`, `GET /api/servers/:id`, `DELETE /api/servers/:id`, `GET /api/servers`
- [ ] Add GCP service account credentials to Vercel env vars
- [ ] Wire provision flow to update Neon DB (so Cloudflare Worker can route)

**Validation:**
- [ ] `POST /api/servers` with valid `masterKeySignature` → returns `{ status: "provisioning" }`
- [ ] `POST /api/servers` again with same user → returns existing server (idempotent), not duplicate
- [ ] GCE VM appears in GCP console within 2 minutes of POST
- [ ] `GET /api/servers/:id` transitions from `provisioning` → `running` once VM is healthy
- [ ] `https://{userId}.myvana.app/health` returns 200 (proving Cloudflare Worker routes to the new VM)
- [ ] `https://{userId}.myvana.app/mcp` responds (MCP endpoint reachable)
- [ ] `DELETE /api/servers/:id` stops the VM, DB state → `stopped`, disk retained
- [ ] After DELETE, `https://{userId}.myvana.app` falls through to FRP (returns "no tunnel active")
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

- **Phase 2 (Worker):** Worker has a kill switch — set a flag to bypass all logic and pass everything to FRP origin. Existing tunnels are never broken.
- **Phase 3 (API):** API routes are additive. If broken, disable the routes; no existing functionality affected.
- **Phase 4 (Login):** Auto-provision on login can be feature-flagged. If it causes issues, disable the flag and users see no server UI.
- **VM failure:** If a specific VM is unhealthy, the provisioning API can deprovision and re-provision. Data survives on the retained disk.
