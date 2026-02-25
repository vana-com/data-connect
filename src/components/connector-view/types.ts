export type CloudViewMode = "neko" | "cdp"

const VALID: readonly string[] = ["neko", "cdp"]

export function parseViewMode(value: string | null): CloudViewMode {
  return value && VALID.includes(value) ? (value as CloudViewMode) : "neko"
}
