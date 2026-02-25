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

/**
 * Formats a date into home/source recency copy:
 * - same day => "Updated today"
 * - 1-7 days => "Updated last Thursday"
 * - 8+ days => "Updated Feb 11"
 */
export function formatUpdatedRecencyLabel(value: string | Date): string {
  const date = toValidDate(value)
  if (!date) return ""

  const MS_PER_DAY = 24 * 60 * 60 * 1000
  const today = new Date()
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  )
  const dateStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  )
  const dayDiff = Math.floor(
    (todayStart.getTime() - dateStart.getTime()) / MS_PER_DAY
  )

  if (dayDiff <= 0) return "Updated today"
  if (dayDiff <= 7) {
    const weekday = date.toLocaleDateString(undefined, { weekday: "long" })
    return `Updated last ${weekday}`
  }

  const monthDay = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
  return `Updated ${monthDay}`
}
