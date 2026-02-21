function toValidDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Formats local date/time as: "Sat Feb 21, 09:51"
 */
export function formatShortWeekdayMonthTime(value: string | Date): string {
  const date = toValidDate(value)
  if (!date) return "Invalid date"

  const weekday = date.toLocaleDateString("en-US", { weekday: "short" })
  const month = date.toLocaleDateString("en-US", { month: "short" })
  const day = date.toLocaleDateString("en-US", { day: "numeric" })
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })

  return `${weekday} ${month} ${day}, ${time}`
}
