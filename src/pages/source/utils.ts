export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function formatRelativeTimeLabel(
  isoDate: string | null | undefined,
  nowMs = Date.now()
): string {
  if (!isoDate) return "never"
  const targetMs = new Date(isoDate).getTime()
  if (Number.isNaN(targetMs)) return "unknown"

  const deltaMs = targetMs - nowMs
  const absMs = Math.abs(deltaMs)
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })

  const minuteMs = 60_000
  const hourMs = 60 * minuteMs
  const dayMs = 24 * hourMs

  if (absMs < hourMs) {
    const mins = Math.round(deltaMs / minuteMs)
    const absMins = Math.abs(mins)
    if (absMins === 0) return rtf.format(0, "minute")
    const unit = `min${absMins === 1 ? "" : "s"}`
    return mins < 0 ? `${absMins} ${unit} ago` : `in ${absMins} ${unit}`
  }
  if (absMs < dayMs) {
    return rtf.format(Math.round(deltaMs / hourMs), "hour")
  }
  return rtf.format(Math.round(deltaMs / dayMs), "day")
}
