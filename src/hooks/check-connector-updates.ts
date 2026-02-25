import type { Runtime } from "@/lib/runtime"
import {
  setConnectorUpdates,
  setIsCheckingUpdates,
  type AppDispatch,
} from "@/state/store"
import type { ConnectorUpdateInfo } from "@/types"

interface CheckConnectorUpdatesOptions {
  force?: boolean
  onError?: (error: unknown) => void
}

export async function checkConnectorUpdates(
  runtime: Runtime,
  dispatch: AppDispatch,
  options: CheckConnectorUpdatesOptions = {}
) {
  const { force = false, onError } = options
  dispatch(setIsCheckingUpdates(true))
  try {
    const updates = await runtime.invoke<ConnectorUpdateInfo[]>("check_connector_updates", {
      force,
    })
    dispatch(setConnectorUpdates(updates))
    return updates
  } catch (error) {
    onError?.(error)
    return []
  } finally {
    dispatch(setIsCheckingUpdates(false))
  }
}
