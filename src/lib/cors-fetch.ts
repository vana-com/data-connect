/**
 * CORS-bypassing fetch utility.
 *
 * In the Tauri desktop runtime, browser fetch() fails on cross-origin requests
 * when the remote server doesn't set Access-Control-Allow-Origin headers.
 * The Tauri HTTP plugin routes requests through the Rust backend, bypassing
 * browser CORS entirely. In a plain browser context we fall back to global fetch.
 */

function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI__" in window || "__TAURI_INTERNALS__" in window)
  );
}

export async function corsFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  if (isTauriRuntime()) {
    const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");
    return tauriFetch(input, init);
  }
  return fetch(input, init);
}
