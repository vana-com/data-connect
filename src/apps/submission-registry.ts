import { z } from "zod"
import { isAllowedSubmittedAppExternalUrl } from "./external-url"
import { getPrimaryDataSourceLabel } from "@/lib/scope-labels"
import type { AppRegistryEntry } from "./registry-types"

const rawSubmissionFiles = import.meta.glob(
  "../../ecosystem/app-submissions/*.md",
  {
    eager: true,
    import: "default",
    query: "?raw",
  }
)

const appSubmissionBaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().min(1),
  iconUrl: z
    .string()
    .url()
    .refine(isAllowedSubmittedAppExternalUrl, {
      message: "iconUrl must use https://.",
    })
    .optional(),
  description: z.string().min(1),
  category: z.string().min(1),
})

const liveAppSubmissionSchema = appSubmissionBaseSchema.extend({
  status: z.literal("live"),
  externalUrl: z.string().url().refine(isAllowedSubmittedAppExternalUrl, {
    message: "externalUrl must use https://.",
  }),
  scopes: z.array(z.string().min(1)).min(1),
})

const comingSoonAppSubmissionSchema = appSubmissionBaseSchema.extend({
  status: z.literal("coming-soon"),
  scopes: z.array(z.string().min(1)).optional(),
})

const appSubmissionSchema = z.discriminatedUnion("status", [
  liveAppSubmissionSchema,
  comingSoonAppSubmissionSchema,
])

export function parseAppSubmissionMarkdown(
  filePath: string,
  rawMarkdown: string
): AppRegistryEntry | null {
  if (filePath.endsWith("/_template.md")) {
    return null
  }

  const data = parseFrontmatter(rawMarkdown)
  const parsedEntry = appSubmissionSchema.parse(data)
  const dataRequired = getDataRequiredFromScopes(parsedEntry.scopes)

  return {
    ...parsedEntry,
    dataRequired,
  }
}

export function parseSubmittedAppRegistryEntries(
  rawFiles: Record<string, string>
): AppRegistryEntry[] {
  return [...Object.entries(rawFiles)]
    .sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
    .flatMap(([filePath, rawMarkdown]) => {
      const entry = parseAppSubmissionMarkdown(filePath, rawMarkdown)
      return entry ? [entry] : []
    })
}

export function getSubmittedAppRegistryEntries(): AppRegistryEntry[] {
  return parseSubmittedAppRegistryEntries(
    rawSubmissionFiles as Record<string, string>
  )
}

function getDataRequiredFromScopes(scopes?: string[]) {
  if (!scopes?.length) {
    return []
  }

  return Array.from(
    new Set(
      scopes
        .map(scope => getPrimaryDataSourceLabel([scope]))
        .filter((label): label is string => Boolean(label))
    )
  )
}

function parseFrontmatter(rawMarkdown: string): Record<string, unknown> {
  const lines = rawMarkdown.split(/\r?\n/)

  if (lines[0] !== "---") {
    throw new Error("Submission markdown must start with frontmatter")
  }

  const data: Record<string, unknown> = {}
  let currentListKey: string | null = null

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index]

    if (line === "---") {
      return data
    }

    if (!line.trim()) {
      continue
    }

    const listItemMatch = line.match(/^\s*-\s+(.*)$/)
    if (listItemMatch) {
      if (!currentListKey) {
        throw new Error(`Unexpected frontmatter list item: ${line}`)
      }

      ;(data[currentListKey] as string[]).push(listItemMatch[1].trim())
      continue
    }

    const keyValueMatch = line.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/)
    if (!keyValueMatch) {
      throw new Error(`Unsupported frontmatter line: ${line}`)
    }

    const [, key, rawValue = ""] = keyValueMatch
    const value = rawValue.trim()

    if (value) {
      data[key] = value
      currentListKey = null
      continue
    }

    data[key] = []
    currentListKey = key
  }

  throw new Error(
    "Submission markdown frontmatter is missing a closing delimiter"
  )
}
