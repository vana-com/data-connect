import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const releaseWorkflowPath = resolve(
  process.cwd(),
  ".github/workflows/release.yml"
)

function readReleaseWorkflow() {
  return readFileSync(releaseWorkflowPath, "utf8")
}

describe("release workflow", () => {
  it("publishes latest.json once after the build matrix completes", () => {
    const workflow = readReleaseWorkflow()

    expect(workflow).toContain("publish_updater_manifest:")
    expect(workflow).toContain("needs: build")
    expect(workflow).toContain(
      'gh api "repos/${{ github.repository }}/releases/tags/${{ github.ref_name }}" > release.json'
    )
    expect(workflow).toContain(
      'gh release upload "${{ github.ref_name }}" latest.json --clobber'
    )
  })

  it("keeps updater asset publication on one explicit upload path", () => {
    const workflow = readReleaseWorkflow()

    expect(workflow).not.toContain("tagName:")
    expect(workflow).not.toContain("releaseName:")
    expect(workflow).not.toContain("releaseDraft:")
    expect(workflow).not.toContain("prerelease:")
    expect(workflow).toContain("DataConnect_${version}_${arch}.app.tar.gz")
    expect(workflow).toContain('gh release upload "${{ github.ref_name }}" "$canonical_tarball" --clobber')
    expect(workflow).toContain('gh release upload "${{ github.ref_name }}" "$canonical_signature" --clobber')
  })
})
