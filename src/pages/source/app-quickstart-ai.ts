import type { AppQuickstartArtifact } from "./types"

export type AppQuickstartAiInput = {
  appIdea: string
  sourceId: string
  sourceLabel: string
}

export type AppQuickstartAiResult =
  | {
      status: "success"
      artifact: AppQuickstartArtifact
      providerLabel: string
    }
  | {
      status: "unavailable"
    }
  | {
      status: "invalid"
    }

export async function generateAiQuickstartArtifact(
  _input: AppQuickstartAiInput
): Promise<AppQuickstartAiResult> {
  return {
    status: "unavailable",
  }
}
