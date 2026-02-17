import { invoke } from "@tauri-apps/api/core"
import type { AuthUser } from "../types"

const AUTH_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI__" in window || "__TAURI_INTERNALS__" in window)
  )
}

export interface DurableAuthSession {
  user: AuthUser
  walletAddress: string | null
  masterKeySignature: string | null
  savedAtMs: number
}

function isValidDurableAuthSession(
  value: unknown,
): value is DurableAuthSession {
  if (!value || typeof value !== "object") return false

  const candidate = value as Record<string, unknown>
  const user = candidate.user as Record<string, unknown> | undefined

  return (
    !!user &&
    typeof user.id === "string" &&
    user.id.length > 0 &&
    (user.email === undefined || typeof user.email === "string") &&
    (candidate.walletAddress === null ||
      typeof candidate.walletAddress === "string") &&
    (candidate.masterKeySignature === null ||
      typeof candidate.masterKeySignature === "string") &&
    typeof candidate.savedAtMs === "number"
  )
}

export async function saveAuthSession(session: {
  user: AuthUser
  walletAddress: string | null
  masterKeySignature: string | null
}): Promise<void> {
  if (!isTauriRuntime()) return

  await invoke("save_auth_session", {
    session: {
      ...session,
      savedAtMs: Date.now(),
    },
  })
}

export async function loadAuthSession(): Promise<DurableAuthSession | null> {
  if (!isTauriRuntime()) return null

  const session = await invoke<unknown>("load_auth_session")
  if (!session) return null

  if (!isValidDurableAuthSession(session)) {
    await clearAuthSession()
    return null
  }

  if (Date.now() - session.savedAtMs > AUTH_SESSION_MAX_AGE_MS) {
    await clearAuthSession()
    return null
  }

  return session
}

export async function clearAuthSession(): Promise<void> {
  if (!isTauriRuntime()) return
  await invoke("clear_auth_session")
}
