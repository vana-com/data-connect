/**
 * Runtime abstraction for DataConnect.
 *
 * Tauri mode: wraps @tauri-apps/api calls (desktop app, existing behavior).
 * HTTP mode: uses fetch() for commands and WebSocket for events (cloud mode).
 */

export interface Runtime {
  /** Which runtime backend is active. */
  mode: "tauri" | "http"

  /** Call a backend command (Tauri invoke or HTTP POST). */
  invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>

  /**
   * Subscribe to a backend event. Returns an unsubscribe function.
   * In Tauri mode this wraps `listen()`. In HTTP mode this uses a WebSocket.
   */
  onEvent<T = unknown>(
    event: string,
    handler: (payload: T) => void
  ): () => void

  /**
   * HTTP fetch that bypasses CORS restrictions.
   * In Tauri mode this uses @tauri-apps/plugin-http.
   * In HTTP mode this uses the browser's native fetch (the API server proxies
   * if needed, or CORS headers are set correctly).
   */
  fetch(url: string, init?: RequestInit): Promise<Response>

  /** Open a URL in the user's default browser or a new tab. */
  openUrl(url: string): Promise<void>

  /** Open a local file or folder path. */
  openPath(path: string): Promise<void>

  /** Copy text to the clipboard. */
  copyToClipboard(text: string): Promise<void>

  /** Get the app version string. */
  getAppVersion(): Promise<string>
}
