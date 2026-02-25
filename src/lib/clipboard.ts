import { isTauri } from "@/lib/runtime"

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fallback below for runtimes where Clipboard API is restricted.
  }

  if (typeof document === "undefined") {
    return tauriClipboardFallback(text)
  }

  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "true")
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  document.body.append(textarea)
  textarea.select()

  let copied = false
  try {
    copied = document.execCommand("copy")
  } catch {
    copied = false
  }

  textarea.remove()

  if (copied) return true
  return tauriClipboardFallback(text)
}

async function tauriClipboardFallback(text: string): Promise<boolean> {
  if (!isTauri) return false
  try {
    const { writeText } = await import("@tauri-apps/plugin-clipboard-manager")
    await writeText(text)
    return true
  } catch {
    return false
  }
}
