import { createContext, useContext, useMemo, type ReactNode } from "react"
import type { Runtime } from "./types"
import { createTauriRuntime } from "./tauri-runtime"
import { createHttpRuntime } from "./http-runtime"

const RuntimeContext = createContext<Runtime | null>(null)

export const isTauri =
  typeof window !== "undefined" &&
  ("__TAURI__" in window || "__TAURI_INTERNALS__" in window)

export function RuntimeProvider({ children }: { children: ReactNode }) {
  const runtime = useMemo<Runtime>(
    () => (isTauri ? createTauriRuntime() : createHttpRuntime()),
    []
  )

  return (
    <RuntimeContext.Provider value={runtime}>{children}</RuntimeContext.Provider>
  )
}

export function useRuntime(): Runtime {
  const runtime = useContext(RuntimeContext)
  if (!runtime) {
    throw new Error("useRuntime must be used within a RuntimeProvider")
  }
  return runtime
}
