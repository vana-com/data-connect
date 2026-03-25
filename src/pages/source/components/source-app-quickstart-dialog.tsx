import { WandSparklesIcon } from "lucide-react"
import { LoadingButton } from "@/components/elements/button-loading"
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/classes"
import { getPromptPreview } from "../app-quickstart"
import type {
  AppQuickstartArtifact,
  CopyStatus,
  QuickstartGenerationState,
  StarterAppMatch,
} from "../types"

interface SourceAppQuickstartDialogProps {
  open: boolean
  sourceName: string
  localDataLocation: string | null
  sourceSummary: string
  starterAppMatch: StarterAppMatch | null
  quickstartIdea: string
  quickstartState: QuickstartGenerationState
  promptCopyStatus: CopyStatus
  revealFilesStatus: CopyStatus
  onOpenChange: (open: boolean) => void
  onQuickstartIdeaChange: (value: string) => void
  onGenerateQuickstart: () => Promise<void>
  onCopyPrompt: () => Promise<void>
  onRevealFiles: () => Promise<void>
  onOpenStarterApp: (match: StarterAppMatch) => void
}

export function SourceAppQuickstartDialog({
  open,
  sourceName,
  localDataLocation,
  sourceSummary,
  starterAppMatch,
  quickstartIdea,
  quickstartState,
  promptCopyStatus,
  revealFilesStatus,
  onOpenChange,
  onQuickstartIdeaChange,
  onGenerateQuickstart,
  onCopyPrompt,
  onRevealFiles,
  onOpenStarterApp,
}: SourceAppQuickstartDialogProps) {
  const trimmedIdea = quickstartIdea.trim()
  const artifact =
    quickstartState.status === "generated" ||
    quickstartState.status === "fallback-ready"
      ? quickstartState.artifact
      : null
  const artifactIdea = artifact?.intent.appIdea.trim() ?? null
  const isArtifactStale = Boolean(
    artifact && artifactIdea && artifactIdea !== trimmedIdea
  )
  const isGenerating = quickstartState.status === "generating"
  const isFallbackReady = quickstartState.status === "fallback-ready"
  const showCopyPromptAction = Boolean(
    artifact && !isArtifactStale && !isGenerating
  )
  const showGenerateAction =
    !showCopyPromptAction || quickstartState.status === "error-with-retry"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-3xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/70 px-6 pb-4 pt-6">
          <DialogTitle>Create app from {sourceName}</DialogTitle>
          <DialogDescription className="max-w-2xl pr-8">
            DataConnect can prepare a local-first quickstart from this source so
            you can get to a working demo quickly.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-4 overflow-y-auto px-6 py-5">
          <section className={contextCardClassName}>
            <div className="flex items-center gap-2">
              <WandSparklesIcon
                aria-hidden
                className="size-4 text-foreground/80"
              />
              <Text as="h2" intent="small" weight="medium">
                Source context
              </Text>
            </div>
            <div className="grid gap-3 text-small text-foreground/85">
              <div className="grid gap-1">
                <Text as="p" intent="fine" muted>
                  Source
                </Text>
                <Text as="p" intent="small">
                  {sourceName}
                </Text>
              </div>
              <div className="grid gap-1">
                <Text as="p" intent="fine" muted>
                  Local data location
                </Text>
                <code className="rounded-card bg-background px-3 py-2 text-xs text-foreground/80">
                  {localDataLocation ??
                    "Reveal the source folder from DataConnect"}
                </code>
              </div>
              <div className="grid gap-1">
                <Text as="p" intent="fine" muted>
                  Source summary
                </Text>
                <Text as="p" intent="small" className="text-pretty">
                  {sourceSummary}
                </Text>
              </div>
            </div>
          </section>

          {starterAppMatch ? (
            <section className={contextCardClassName}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <Text as="h2" intent="small" weight="medium">
                    Starter app
                  </Text>
                  <Text as="p" intent="small">
                    {starterAppMatch.appLabel}
                  </Text>
                  {starterAppMatch.appDescription ? (
                    <Text as="p" intent="small" muted>
                      {starterAppMatch.appDescription}
                    </Text>
                  ) : null}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenStarterApp(starterAppMatch)}
                >
                  {starterAppMatch.actionLabel}
                </Button>
              </div>
            </section>
          ) : null}

          <section className={contextCardClassName}>
            <div className="grid gap-2">
              <Label htmlFor="app-quickstart-idea">
                What do you want to make?
              </Label>
              <Textarea
                id="app-quickstart-idea"
                value={quickstartIdea}
                placeholder="For example: a personal search tool, a profile site, or a lightweight analytics view."
                disabled={isGenerating}
                className="min-h-28 rounded-card bg-background"
                onChange={event => onQuickstartIdeaChange(event.target.value)}
              />
              <Text as="p" intent="fine" muted>
                One short idea is enough. We&apos;ll use it to prepare the
                handoff.
              </Text>
            </div>
          </section>

          <section className={artifactPanelClassName}>
            {quickstartState.status === "idle" ? (
              <ArtifactPlaceholder />
            ) : quickstartState.status === "generating" ? (
              <ArtifactLoading />
            ) : quickstartState.status === "error-with-retry" ? (
              <ArtifactError message={quickstartState.message} />
            ) : artifact ? (
              <ArtifactPreview
                artifact={artifact}
                isFallbackReady={isFallbackReady}
                isArtifactStale={isArtifactStale}
              />
            ) : (
              <ArtifactPlaceholder />
            )}
          </section>
        </div>

        <DialogFooter className="border-t border-border/70 px-6 py-4">
          <DialogClose asChild>
            <Button variant="outline" size="sm">
              Close
            </Button>
          </DialogClose>

          {artifact ? (
            <LoadingButton
              variant="outline"
              size="sm"
              isLoading={revealFilesStatus === "copying"}
              loadingLabel="Reveal handoff files"
              onClick={() => void onRevealFiles()}
            >
              Reveal handoff files
            </LoadingButton>
          ) : null}

          {artifact && !isArtifactStale ? (
            isFallbackReady ? (
              <Button
                variant="outline"
                size="sm"
                disabled={isGenerating || !trimmedIdea}
                onClick={() => void onGenerateQuickstart()}
              >
                Retry with AI
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={isGenerating || !trimmedIdea}
                onClick={() => void onGenerateQuickstart()}
              >
                Generate again
              </Button>
            )
          ) : null}

          {showGenerateAction ? (
            <LoadingButton
              size="sm"
              disabled={!trimmedIdea}
              isLoading={isGenerating}
              loadingLabel="Generating quickstart..."
              onClick={() => void onGenerateQuickstart()}
            >
              {quickstartState.status === "error-with-retry"
                ? "Retry generation"
                : "Generate quickstart"}
            </LoadingButton>
          ) : (
            <LoadingButton
              size="sm"
              isLoading={promptCopyStatus === "copying"}
              loadingLabel="Copy prompt"
              onClick={() => void onCopyPrompt()}
            >
              Copy prompt
            </LoadingButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ArtifactPlaceholder() {
  return (
    <div className="grid gap-2">
      <Text as="h2" intent="small" weight="medium">
        Quickstart artifact
      </Text>
      <Text as="p" intent="small" muted>
        Enter one app idea, then generate a quickstart handoff you can copy or
        reveal as local files.
      </Text>
    </div>
  )
}

function ArtifactLoading() {
  return (
    <div className="grid gap-2">
      <Text as="h2" intent="small" weight="medium">
        Preparing quickstart
      </Text>
      <Text as="p" intent="small" muted>
        We&apos;re building the handoff artifact for this source now.
      </Text>
    </div>
  )
}

function ArtifactError({ message }: { message: string }) {
  return (
    <div className="grid gap-2">
      <Text as="h2" intent="small" weight="medium">
        Quickstart artifact
      </Text>
      <Text as="p" intent="small" color="destructive">
        {message}
      </Text>
    </div>
  )
}

function ArtifactPreview({
  artifact,
  isFallbackReady,
  isArtifactStale,
}: {
  artifact: AppQuickstartArtifact
  isFallbackReady: boolean
  isArtifactStale: boolean
}) {
  return (
    <div className="grid gap-4">
      <div className="space-y-1">
        <Text as="h2" intent="small" weight="medium">
          {artifact.handoff.title}
        </Text>
        <Text as="p" intent="small" muted>
          {artifact.handoff.summary}
        </Text>
      </div>

      {isFallbackReady ? (
        <div className="rounded-card border border-border/80 bg-muted/40 px-4 py-3">
          <Text as="p" intent="small">
            This quickstart is the local fallback artifact, so you can still
            move forward even without AI generation.
          </Text>
        </div>
      ) : null}

      {isArtifactStale ? (
        <div className="rounded-card border border-border/80 bg-muted/40 px-4 py-3">
          <Text as="p" intent="small">
            The app idea changed after this artifact was generated. Generate
            again to refresh the handoff.
          </Text>
        </div>
      ) : null}

      <div className="grid gap-2">
        <Text as="p" intent="fine" muted>
          Prompt preview
        </Text>
        <pre
          className={cn(
            "max-h-56 overflow-auto rounded-card bg-background px-4 py-3",
            "font-mono text-compact leading-6 text-foreground/80"
          )}
        >
          {getPromptPreview(artifact.handoff.prompt)}
        </pre>
      </div>

      <div className="grid gap-1">
        <Text as="p" intent="fine" muted>
          Next step
        </Text>
        <Text as="p" intent="small">
          {artifact.handoff.nextStep}
        </Text>
      </div>
    </div>
  )
}

const contextCardClassName =
  "grid gap-3 rounded-card border border-border/70 bg-muted/25 px-4 py-4"

const artifactPanelClassName =
  "grid gap-3 rounded-card border border-border/70 bg-card px-4 py-4"
