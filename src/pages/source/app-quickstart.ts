import { getAppRegistryEntries } from "@/apps/registry"
import type { LiveAppRegistryEntry } from "@/apps/registry-types"
import type { AppQuickstartArtifact, StarterAppMatch } from "./types"

const FALLBACK_LOCAL_PATH_HINT = "Reveal the source folder from DataConnect"
const MAX_SUMMARY_SNIPPET_CHARS = 280
const MAX_PROMPT_SNIPPET_CHARS = 360

type BuildFallbackArtifactOptions = {
  sourceId: string
  sourceLabel: string
  localDataLocation?: string | null
  sourceSummary: string
  appIdea: string
  starterAppMatch: StarterAppMatch | null
}

export function getStarterAppMatch(sourceId: string): StarterAppMatch | null {
  const matches = getAppRegistryEntries().filter(
    (app): app is LiveAppRegistryEntry =>
      app.status === "live" &&
      app.dataRequired.some(requirement => requirement.token === sourceId)
  )

  if (matches.length !== 1) {
    return null
  }

  const [match] = matches
  return {
    sourceId,
    appLabel: match.name,
    appDescription: match.description,
    destinationUrl: match.externalUrl,
    actionLabel: `Open ${match.name}`,
  }
}

export function buildSourceSummary(
  sourceLabel: string,
  previewJson: string,
  options: { isTruncated?: boolean } = {}
): string {
  const shapeSummary = describePreviewShape(previewJson, sourceLabel)
  const snippet = truncateText(previewJson.trim().replace(/\s+/g, " "))
  const truncatedSuffix = options.isTruncated ? " Preview is truncated." : ""

  return `${shapeSummary}${truncatedSuffix} Preview snippet: ${snippet}`
}

export function buildFallbackQuickstartArtifact({
  sourceId,
  sourceLabel,
  localDataLocation,
  sourceSummary,
  appIdea,
  starterAppMatch,
}: BuildFallbackArtifactOptions): AppQuickstartArtifact {
  const normalizedIdea = appIdea.trim()
  const location = localDataLocation?.trim() || FALLBACK_LOCAL_PATH_HINT
  const handoffTitle = `${normalizedIdea} quickstart from ${sourceLabel}`
  const handoffSummary = `A local-first handoff for building ${normalizedIdea} from your ${sourceLabel} export.`
  const nextStep =
    "Paste this prompt into your coding tool, keep the export local, and build the first runnable demo against the source path above."

  const starterAppNote = starterAppMatch
    ? `\nExisting example app:\n- ${starterAppMatch.appLabel}: ${starterAppMatch.destinationUrl}\nUse it for inspiration, but still generate something new for this quickstart.`
    : ""

  const prompt = [
    `Build a local-first starter app from the user's ${sourceLabel} export.`,
    "",
    "App idea:",
    normalizedIdea,
    "",
    "Source context:",
    `- Source: ${sourceLabel} (${sourceId})`,
    `- Local data location: ${location}`,
    `- Source summary: ${sourceSummary}`,
    "",
    "Requirements:",
    "1. Read the local export from the path above.",
    "2. Do not upload raw exported data to remote services.",
    `3. Build a small, useful demo that makes ${normalizedIdea} tangible quickly.`,
    "4. Include a README with setup, run steps, and any schema assumptions.",
    "5. Keep the first version understandable and easy to iterate on.",
    starterAppNote,
  ]
    .filter(Boolean)
    .join("\n")

  return {
    source: {
      id: sourceId,
      label: sourceLabel,
      localDataLocation: location,
      sourceSummary,
    },
    intent: {
      appIdea: normalizedIdea,
    },
    handoff: {
      title: handoffTitle,
      summary: handoffSummary,
      prompt,
      nextStep,
      exampleAppLabel: starterAppMatch?.appLabel,
      exampleAppHref: starterAppMatch?.destinationUrl,
    },
    advanced: {
      dataProcessingPrompt: `Inspect the ${sourceLabel} export in place, map the key entities, and note any transformations needed for ${normalizedIdea}.`,
    },
    generation: {
      mode: "fallback",
    },
  }
}

export function serializeAppQuickstartMarkdown(
  artifact: AppQuickstartArtifact
): string {
  const exampleSection =
    artifact.handoff.exampleAppLabel && artifact.handoff.exampleAppHref
      ? `\n## Example app\n\n- ${artifact.handoff.exampleAppLabel}: ${artifact.handoff.exampleAppHref}\n`
      : ""

  return [
    `# ${artifact.handoff.title}`,
    "",
    artifact.handoff.summary,
    "",
    "## Source context",
    "",
    `- Source: ${artifact.source.label} (${artifact.source.id})`,
    `- Local data location: ${artifact.source.localDataLocation}`,
    `- Generation mode: ${artifact.generation.mode}`,
    "",
    "## Source summary",
    "",
    artifact.source.sourceSummary,
    "",
    "## Prompt",
    "",
    artifact.handoff.prompt,
    "",
    "## Next step",
    "",
    artifact.handoff.nextStep,
    exampleSection.trimEnd(),
  ]
    .filter(Boolean)
    .join("\n")
}

export function serializeSourceContextJson(
  artifact: AppQuickstartArtifact
): string {
  return JSON.stringify(
    {
      source: artifact.source,
      intent: artifact.intent,
      generation: artifact.generation,
      handoff: {
        title: artifact.handoff.title,
        summary: artifact.handoff.summary,
        nextStep: artifact.handoff.nextStep,
        exampleAppLabel: artifact.handoff.exampleAppLabel,
        exampleAppHref: artifact.handoff.exampleAppHref,
      },
    },
    null,
    2
  )
}

export function getPromptPreview(prompt: string): string {
  return truncateText(
    prompt.trim().replace(/\s+/g, " "),
    MAX_PROMPT_SNIPPET_CHARS
  )
}

function describePreviewShape(
  sourcePreview: string,
  sourceLabel: string
): string {
  try {
    const parsed = JSON.parse(sourcePreview)
    if (Array.isArray(parsed)) {
      return `${sourceLabel} preview is an array with ${parsed.length} top-level items.`
    }
    if (parsed && typeof parsed === "object") {
      const keys = Object.keys(parsed)
      if (keys.length === 0) {
        return `${sourceLabel} preview is an empty object.`
      }
      const visibleKeys = keys.slice(0, 6).join(", ")
      const moreSuffix = keys.length > 6 ? ", and more" : ""
      return `${sourceLabel} preview includes top-level keys: ${visibleKeys}${moreSuffix}.`
    }
    return `${sourceLabel} preview is a JSON ${typeof parsed}.`
  } catch {
    return `${sourceLabel} preview is available as raw JSON text.`
  }
}

function truncateText(input: string, maxChars = MAX_SUMMARY_SNIPPET_CHARS) {
  if (input.length <= maxChars) {
    return input
  }
  return `${input.slice(0, maxChars).trimEnd()}...`
}
