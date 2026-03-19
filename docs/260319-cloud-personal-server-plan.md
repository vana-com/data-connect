# Cloud Personal Server on account.vana.org

**Date:** 2026-03-19
**Status:** Draft / RFC
**Repos:** vana-connect (primary), personal-server-ts, data-connect (reference)

## Goal

When a user logs into account.vana.org, a Personal Server is provisioned for them in the cloud. They can see its status, copy its MCP endpoint, and use it for grants. No desktop app required.

## Architecture

```
account.vana.org (Next.js on Vercel)
   |
   |  /api/server/provision   (serverless)
   |  /api/server/status
   |  /api/server/deprovision
   |
   v
Provider Abstraction Layer
   |
   +-- GCPProvider     (initial: GCE micro VMs)
   +-- SpritesProvider  (future: Sprites.dev Firecracker MicroVMs)
   |
   v
Per-User Personal Server (personal-server-ts in Docker)
   - Hono.js HTTP server
   - SQLite index + local data storage
   - Grant management + Gateway registration
   - MCP endpoint at /mcp
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
   - `tunnel.enabled: false` (server is directly addressable)
   - `devUi.enabled: false` (no browser on the VM)
   - `sync.enabled: false` (for now)
   - Accept `SERVER_ORIGIN` env var so it knows its own public URL

3. **Container registry:** Push image to GCP Artifact Registry (and later Sprites.dev registry)

4. **Health check:** Already has `/health` endpoint. Add a `HEALTHCHECK` instruction.

5. **Persistent volume:** `$PERSONAL_SERVER_ROOT_PATH` (default `/data`) must be a persistent disk for `index.db`, `key.json`, `data/`, `logs/`.

**Env vars at container start:**
- `VANA_MASTER_KEY_SIGNATURE` — derived from user's wallet, used for server identity
- `PERSONAL_SERVER_ROOT_PATH` — `/data` (mounted persistent volume)
- `SERVER_ORIGIN` — public URL (e.g., `https://<user-id>.ps.vana.org`)

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
- `provision()`: Create VM from personal-server container image, attach persistent disk, set env vars, assign external IP or use a load balancer
- `status()`: Check VM status + hit `/health`
- `deprovision()`: Stop and delete VM

Authentication: Vercel serverless routes use a GCP service account key (stored as env var/secret).

**Why VMs over Cloud Run:** Personal Servers are long-lived, stateful (SQLite on disk), and need to be always-addressable for MCP and grant callbacks. Cloud Run's request-based lifecycle and ephemeral filesystem make it a poor fit.

#### 3. Data Store (Neon Postgres)

Simple table mapping users to their provisioned servers:

```sql
CREATE TABLE personal_servers (
  id          TEXT PRIMARY KEY,        -- generated server ID
  user_id     TEXT UNIQUE NOT NULL,    -- Privy user ID or wallet address
  provider    TEXT NOT NULL,           -- 'gcp' | 'sprites'
  provider_id TEXT,                    -- GCP instance name / Sprites VM ID
  url         TEXT,                    -- public URL of the server
  state       TEXT NOT NULL DEFAULT 'provisioning',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
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
  url: "https://srv-abc123.ps.vana.org",
  mcp_endpoint: "https://srv-abc123.ps.vana.org/mcp",
  owner_address: "0x...",
  provider: "gcp",
  created: 1710806400,
  updated: 1710806460
}
```

**Auth:** All routes recover wallet address from `masterKeySignature` header (same pattern as existing `/api/sign`). Servers are scoped to the authenticated user — you can only access your own.

#### 5. Provisioning on Login

In the connect app's auth flow, after Privy login completes:
- Call `/api/server/provision` with the user's master key signature
- If server already exists and is running, just fetch status
- Show provisioning progress in UI (polling `/api/server/status`)

#### 6. UI (in connect app)

Add a "Personal Server" section to the authenticated user's dashboard:
- **Status indicator:** provisioning / running / stopped / error
- **Server URL:** copyable
- **MCP endpoint:** `{serverUrl}/mcp` — copyable, with instructions for Claude Desktop
- **Actions:** Restart (deprovision + provision), or just status for now

### data-connect — Reference Only

No changes needed in data-connect for this work. Its personal server code (Tauri subprocess management, grant flow, ingest) serves as reference for how the protocol works. The vana-connect SDK's `src/personal-server/` client already has grant and ingest functionality that can be evolved.

## Sequencing

### Phase 1: Containerize Personal Server
- [ ] Write Dockerfile for personal-server-ts
- [ ] Test locally with `docker run`
- [ ] Push to GCP Artifact Registry
- [ ] Verify: container starts, `/health` responds, grants work

### Phase 2: GCP Provider + API Routes
- [ ] Create GCP provider implementation
- [ ] Set up Neon Postgres table
- [ ] Implement `/api/server/provision`, `/status`, `/deprovision`
- [ ] Test end-to-end: API call → VM created → server running → health OK

### Phase 3: Login Integration + UI
- [ ] Wire provisioning into post-login flow
- [ ] Build server status UI in connect app
- [ ] Show MCP endpoint
- [ ] Test full user journey: login → server provisioned → MCP endpoint works

### Phase 4: Sprites.dev Provider (later)
- [ ] Implement SpritesProvider against Sprites.dev API
- [ ] Swap provider via env var (`SERVER_PROVIDER=sprites`)
- [ ] Same interface, different backend

## Open Questions

1. **DNS / URL scheme:** Per-user subdomains (`<userId>.ps.vana.org`) vs path-based (`ps.vana.org/<userId>`) vs opaque (`ps.vana.org/srv_abc123`)? Subdomains are cleanest for MCP but need wildcard DNS + TLS.

2. **Persistent disk lifecycle:** When a user deprovisions, do we keep the disk (data survives re-provision) or delete it? Leaning toward keep-for-30-days.

3. **Server registration with Gateway:** Currently the desktop app calls `/api/sign` on account.vana.org to sign the EIP-712 registration message. In the cloud flow, the provisioning API can trigger registration automatically after the server starts. Should it?

4. **Cost:** e2-micro is ~$7/mo per user. At scale, Sprites.dev MicroVMs should be cheaper. For testing/early users this is fine.

5. **Security:** The `masterKeySignature` is sensitive — it derives the server's keypair. We pass it to the container as an env var. In production we should use GCP Secret Manager or Sprites.dev's secret injection. For MVP, env var is acceptable.
