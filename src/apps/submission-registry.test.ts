import { afterEach, describe, expect, it } from "vitest"
import { parseAppSubmissionMarkdown } from "./submission-registry"

const originalBuffer = globalThis.Buffer

afterEach(() => {
  globalThis.Buffer = originalBuffer
})

describe("parseAppSubmissionMarkdown", () => {
  it("parses a live submission", () => {
    const entry = parseAppSubmissionMarkdown(
      "/virtual/ecosystem/app-submissions/example.md",
      `---
id: example
name: Example App
status: live
externalUrl: https://example.com
icon: E
description: Example app description.
category: Assistant
scopes:
  - chatgpt.conversations
---

## Notes

- Example submission.
`
    )

    expect(entry).toEqual({
      id: "example",
      name: "Example App",
      status: "live",
      externalUrl: "https://example.com",
      icon: "E",
      iconUrl: undefined,
      description: "Example app description.",
      category: "Assistant",
      dataRequired: ["ChatGPT"],
      scopes: ["chatgpt.conversations"],
    })
  })

  it("parses an optional iconUrl override", () => {
    const entry = parseAppSubmissionMarkdown(
      "/virtual/ecosystem/app-submissions/example.md",
      `---
id: example
name: Example App
status: live
externalUrl: https://example.com
icon: E
iconUrl: https://cdn.example.com/icon.svg
description: Example app description.
category: Assistant
scopes:
  - chatgpt.conversations
---`
    )

    expect(entry?.iconUrl).toBe("https://cdn.example.com/icon.svg")
  })

  it("rejects non-https icon urls", () => {
    expect(() =>
      parseAppSubmissionMarkdown(
        "/virtual/ecosystem/app-submissions/invalid.md",
        `---
id: invalid
name: Invalid App
status: live
externalUrl: https://example.com
icon: I
iconUrl: http://cdn.example.com/icon.svg
description: Invalid icon URL.
category: Demo
scopes:
  - chatgpt.conversations
---`
      )
    ).toThrow(/iconUrl/i)
  })

  it("parses submission markdown when Buffer is unavailable", () => {
    globalThis.Buffer = undefined as never

    const entry = parseAppSubmissionMarkdown(
      "/virtual/ecosystem/app-submissions/example.md",
      `---
id: example
name: Example App
status: live
externalUrl: https://example.com
icon: E
description: Example app description.
category: Assistant
scopes:
  - chatgpt.conversations
---`
    )

    expect(entry?.dataRequired).toEqual(["ChatGPT"])
  })

  it("dedupes multiple scopes from the same platform into one label", () => {
    const entry = parseAppSubmissionMarkdown(
      "/virtual/ecosystem/app-submissions/example.md",
      `---
id: example
name: Example App
status: live
externalUrl: https://example.com
icon: E
description: Example app description.
category: Assistant
scopes:
  - linkedin.profile
  - linkedin.connections
---`
    )

    expect(entry?.dataRequired).toEqual(["LinkedIn"])
  })

  it("ignores the template file", () => {
    const entry = parseAppSubmissionMarkdown(
      "/virtual/ecosystem/app-submissions/_template.md",
      "---\nid: ignored\nname: Ignored\nstatus: coming-soon\nicon: I\ndescription: Ignored.\ncategory: Demo\n---"
    )

    expect(entry).toBeNull()
  })

  it("requires live apps to declare an external url", () => {
    expect(() =>
      parseAppSubmissionMarkdown(
        "/virtual/ecosystem/app-submissions/invalid.md",
        `---
id: invalid
name: Invalid App
status: live
icon: I
description: Missing external URL.
category: Demo
scopes:
  - chatgpt.conversations
---`
      )
    ).toThrow()
  })

  it("rejects non-http submission schemes", () => {
    expect(() =>
      parseAppSubmissionMarkdown(
        "/virtual/ecosystem/app-submissions/invalid.md",
        `---
id: invalid
name: Invalid App
status: live
externalUrl: mailto:test@example.com
icon: I
description: Invalid external URL.
category: Demo
scopes:
  - chatgpt.conversations
---`
      )
    ).toThrow(/externalUrl/i)
  })

  it("rejects http urls", () => {
    expect(() =>
      parseAppSubmissionMarkdown(
        "/virtual/ecosystem/app-submissions/invalid.md",
        `---
id: invalid
name: Invalid App
status: live
externalUrl: http://example.com
icon: I
description: Invalid external URL.
category: Demo
scopes:
  - chatgpt.conversations
---`
      )
    ).toThrow(/externalUrl/i)
  })
})
