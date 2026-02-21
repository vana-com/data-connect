import type { Run } from "@/types"

export function getConnectBusyCta(run: Run | null): string {
  if (!run) return "Preparing export..."

  const phaseLabel = run.phase?.label?.trim()
  if (phaseLabel) return phaseLabel

  const statusMessage = run.statusMessage?.trim()
  if (!statusMessage) return "Preparing export..."

  const normalizedMessage = statusMessage.toLowerCase()

  if (normalizedMessage.includes("checking browser")) {
    return "Checking browser..."
  }
  if (normalizedMessage.includes("downloading browser")) {
    return "Downloading browser..."
  }
  if (
    normalizedMessage.includes("launching browser") ||
    normalizedMessage.includes("authorizing")
  ) {
    return "Opening browser..."
  }

  return statusMessage
}
