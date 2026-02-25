import type { Runtime } from "./types"

/**
 * Tauri runtime — wraps existing @tauri-apps/api calls.
 * This preserves the exact desktop-app behavior.
 */
export function createTauriRuntime(): Runtime {
  return {
    mode: "tauri",

    async invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
      const { invoke } = await import("@tauri-apps/api/core")
      return invoke<T>(command, args)
    },

    onEvent<T = unknown>(event: string, handler: (payload: T) => void): () => void {
      let unlistenFn: (() => void) | null = null
      let cancelled = false

      import("@tauri-apps/api/event").then(({ listen }) => {
        listen<T>(event, (e) => {
          if (!cancelled) handler(e.payload)
        }).then((unlisten) => {
          if (cancelled) {
            unlisten()
          } else {
            unlistenFn = unlisten
          }
        })
      })

      return () => {
        cancelled = true
        unlistenFn?.()
      }
    },

    async fetch(url: string, init?: RequestInit): Promise<Response> {
      const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http")
      return tauriFetch(url, init)
    },

    async openUrl(url: string): Promise<void> {
      const { open } = await import("@tauri-apps/plugin-shell")
      await open(url)
    },

    async openPath(path: string): Promise<void> {
      try {
        const { open } = await import("@tauri-apps/plugin-shell")
        await open(path)
      } catch {
        const { invoke } = await import("@tauri-apps/api/core")
        await invoke("open_folder", { path })
      }
    },

    async copyToClipboard(text: string): Promise<void> {
      const { writeText } = await import("@tauri-apps/plugin-clipboard-manager")
      await writeText(text)
    },

    async getAppVersion(): Promise<string> {
      const { getVersion } = await import("@tauri-apps/api/app")
      return getVersion()
    },
  }
}
