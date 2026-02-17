import { invoke } from "@tauri-apps/api/core"
import { LINKS } from "@/config/links"
import { openExternalUrl } from "@/lib/open-resource"

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID ?? ""
const PRIVY_CLIENT_ID = import.meta.env.VITE_PRIVY_CLIENT_ID ?? null

function isTauriRuntime(): boolean {
  if (typeof window === "undefined") return false
  return "__TAURI__" in window || "__TAURI_INTERNALS__" in window
}

/**
 * Launch the external auth flow through the Tauri callback server when available.
 * Falls back to opening the Passport URL directly in plain browser environments.
 */
export async function startBrowserAuthFlow(): Promise<string | null> {
  try {
    return await invoke<string>("start_browser_auth", {
      privyAppId: PRIVY_APP_ID,
      privyClientId: PRIVY_CLIENT_ID,
    })
  } catch {
    if (isTauriRuntime()) {
      return null
    }
    if (LINKS.passportSignInStub) {
      await openExternalUrl(LINKS.passportSignInStub)
      return LINKS.passportSignInStub
    }
    return null
  }
}
