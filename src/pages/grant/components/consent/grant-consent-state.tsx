import { AlertTriangleIcon } from "lucide-react"
import { IconFlow } from "@/components/elements/icon-flow"
import { PageContainer } from "@/components/elements/page-container"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/typography/text"
import { PageHeading } from "@/components/typography/page-heading"
import { LoadingButton } from "@/components/elements/button-loading"
import { OpenExternalLink } from "@/components/typography/link-open-external"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { cn } from "@/lib/classes"
import { LINKS } from "@/config/links"
import {
  formatScopeLabel,
  formatListAsSentence,
  getDataTypeFromScopeLabel,
  getPrimaryDataSourceLabel,
  getPrimaryScopeToken,
} from "@/lib/scope-labels"
import type { BuilderManifest } from "../../types"
import { ActionPanel } from "@/components/typography/button-action"
import { fieldHeight } from "@/components/typography/field"

// Note: `isApproving` maps to the "creating-grant" / "approving" states.
// The consent screen stays visible while the Allow button shows a loading spinner.
interface GrantConsentStateProps {
  scopes: string[]
  builderManifest?: BuilderManifest
  appName?: string
  isApproving: boolean
  onApprove: () => void
  onDeny?: () => void
}

/** Pick the best icon from builder manifest icons array (prefer 48–96px). */
function pickBuilderIcon(manifest?: BuilderManifest): string | undefined {
  if (!manifest?.icons?.length) return undefined
  // Prefer an icon in the 48–96px range; fall back to first
  const sized = manifest.icons.find(icon => {
    const w = parseInt(icon.sizes?.split("x")[0] ?? "", 10)
    return w >= 48 && w <= 96
  })
  return (sized ?? manifest.icons[0]).src
}

function buildConsentRows(scopes: string[]) {
  const rows: ConsentRow[] = []
  const groups = new Map<
    string,
    {
      sourceLabel: string | null
      scopes: string[]
    }
  >()

  for (const scope of scopes) {
    const platformKey = getPrimaryScopeToken([scope]) ?? scope
    const group = groups.get(platformKey)

    if (group) {
      group.scopes.push(scope)
      continue
    }

    groups.set(platformKey, {
      sourceLabel: getPrimaryDataSourceLabel([scope]),
      scopes: [scope],
    })
  }

  for (const [platformKey, group] of groups) {
    const scopeLabels = group.scopes.map(formatScopeLabel)

    if (group.sourceLabel && group.scopes.length > 1) {
      rows.push({
        kind: "grouped",
        key: platformKey,
        sourceLabel: group.sourceLabel,
        sentence: `See your ${group.sourceLabel} ${formatListAsSentence(
          scopeLabels.map(label =>
            getDataTypeFromScopeLabel(label, group.sourceLabel!)
          )
        )}`,
      })
      continue
    }

    rows.push(
      ...scopeLabels.map((label, index) => ({
        kind: "single" as const,
        key: `${platformKey}-${group.scopes[index] ?? index}`,
        sourceLabel: group.sourceLabel,
        label: `See your ${label}`,
      }))
    )
  }

  return rows
}

function getConsentHeadingDataLabel(scopes: string[]) {
  const platformKeys = new Set(
    scopes
      .map(scope => getPrimaryScopeToken([scope]))
      .filter((scope): scope is string => scope != null)
  )

  if (platformKeys.size !== 1) return "data"

  const dataSourceLabel = getPrimaryDataSourceLabel(scopes)
  return dataSourceLabel ? `${dataSourceLabel} data` : "data"
}

export function GrantConsentState({
  scopes,
  builderManifest,
  appName,
  isApproving,
  onApprove,
  onDeny,
}: GrantConsentStateProps) {
  const dataLabel = getConsentHeadingDataLabel(scopes)
  const rows = buildConsentRows(scopes)
  const resolvedAppName = appName ?? builderManifest?.name ?? "this app"
  const builderIconSrc = pickBuilderIcon(builderManifest)
  const handleCancel = () => {
    if (isApproving) return
    if (onDeny) {
      onDeny()
    }
  }

  return (
    <PageContainer>
      <div className="space-y-w6">
        <PageHeading>Allow access to your {dataLabel}</PageHeading>
        <Text as="p">
          This will allow <strong>{resolvedAppName}</strong> to:
        </Text>

        {/* TODO: style this as design system */}
        {builderManifest?.verified === false && (
          <div className="flex items-center gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2">
            <AlertTriangleIcon
              className="size-4 shrink-0 text-yellow-500"
              aria-hidden="true"
            />
            <Text as="p" intent="small">
              This app could not be verified. Proceed with caution.
            </Text>
          </div>
        )}

        <GrantConsentActionRows
          rows={rows}
          appName={resolvedAppName}
          builderIconSrc={builderIconSrc}
        />

        <Text as="p" intent="fine" dim align="left" balance>
          By clicking <strong>Agree and Allow</strong>, you acknowledge that you
          are initiating access with credentials you control, that third-party
          platform terms may restrict automated access, and that compliance
          responsibility rests with you (not the Vana Foundation). Read the full
          disclosure:{" "}
          <OpenExternalLink
            href={LINKS.legalDataExtractionRiskResponsibilityDisclosure}
          >
            Data Extraction Risk &amp; Responsibility Disclosure
          </OpenExternalLink>
          .
        </Text>

        <div className="flex items-center justify-end gap-2.5">
          <Button
            variant="ghost"
            disabled={isApproving}
            onClick={handleCancel}
            className={cn(
              fieldHeight.base,
              "text-muted-foreground",
              "border border-transparent hover:border-ring hover:bg-background"
            )}
          >
            Cancel
          </Button>
          <LoadingButton
            type="button"
            onClick={onApprove}
            disabled={isApproving}
            isLoading={isApproving}
            loadingLabel="Allowing…"
            variant="dc"
            className={cn(fieldHeight.base, "w-[156px] disabled:opacity-100")}
          >
            Agree and Allow
          </LoadingButton>
        </div>
      </div>
    </PageContainer>
  )
}

type ConsentRow =
  | {
      kind: "grouped"
      key: string
      sourceLabel: string | null
      sentence: string
    }
  | {
      kind: "single"
      key: string
      sourceLabel: string | null
      label: string
    }

interface GrantConsentActionRowsProps {
  rows: ConsentRow[]
  appName: string
  builderIconSrc?: string
}

function GrantConsentActionRows({
  rows,
  appName,
  builderIconSrc,
}: GrantConsentActionRowsProps) {
  return (
    <div className="action-outset">
      {rows.map((row, index) =>
        row.kind === "grouped" ? (
          <GrantConsentGroupedScopeRow
            key={row.key}
            row={row}
            index={index}
            rowCount={rows.length}
            appName={appName}
            builderIconSrc={builderIconSrc}
          />
        ) : (
          <GrantConsentSingleScopeRow
            key={row.key}
            row={row}
            index={index}
            rowCount={rows.length}
            appName={appName}
            builderIconSrc={builderIconSrc}
          />
        )
      )}
    </div>
  )
}

interface GrantConsentScopeRowProps {
  row: Extract<ConsentRow, { kind: "grouped" | "single" }>
  index: number
  rowCount: number
  appName: string
  builderIconSrc?: string
}

function GrantConsentGroupedScopeRow({
  row,
  index,
  rowCount,
  appName,
  builderIconSrc,
}: GrantConsentScopeRowProps) {
  if (row.kind !== "grouped") return null

  return (
    <GrantConsentRowFrame
      sourceLabel={row.sourceLabel}
      index={index}
      rowCount={rowCount}
      appName={appName}
      builderIconSrc={builderIconSrc}
    >
      {row.sentence}
    </GrantConsentRowFrame>
  )
}

function GrantConsentSingleScopeRow({
  row,
  index,
  rowCount,
  appName,
  builderIconSrc,
}: GrantConsentScopeRowProps) {
  if (row.kind !== "single") return null

  return (
    <GrantConsentRowFrame
      sourceLabel={row.sourceLabel}
      index={index}
      rowCount={rowCount}
      appName={appName}
      builderIconSrc={builderIconSrc}
    >
      {row.label}
    </GrantConsentRowFrame>
  )
}

interface GrantConsentRowFrameProps {
  sourceLabel: string | null
  index: number
  rowCount: number
  appName: string
  builderIconSrc?: string
  children: string
}

function GrantConsentRowFrame({
  sourceLabel,
  index,
  rowCount,
  appName,
  builderIconSrc,
  children,
}: GrantConsentRowFrameProps) {
  return (
    <ActionPanel
      className={cn(
        "justify-start gap-w4",
        rowCount > 1 && index === 0 && "rounded-b-none",
        rowCount > 1 &&
          index > 0 &&
          index < rowCount - 1 &&
          "rounded-none border-t-0",
        rowCount > 1 && index === rowCount - 1 && "rounded-t-none border-t-0",
        // Allow the text to wrap naturally
        "h-auto items-start whitespace-normal"
      )}
    >
      {/* Usually 36px high within 64px ActionPanel, so we add pt to keep this illusion */}
      <IconFlow
        className="py-[13.5px]"
        from={
          <PlatformIcon
            iconName={sourceLabel ?? "Data"}
            size={28}
            aria-hidden="true"
          />
        }
        to={
          <PlatformIcon
            iconName={appName}
            imageSrc={builderIconSrc}
            size={28}
            aria-hidden="true"
          />
        }
      />
      <Text as="p" intent="button" weight="medium" className={cn("py-[20px]")}>
        {children}
      </Text>
    </ActionPanel>
  )
}
