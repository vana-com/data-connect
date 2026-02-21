import { AlertTriangleIcon, ArrowRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { Text } from "@/components/typography/text"
import { PageHeading } from "@/components/typography/page-heading"
import { LoadingButton } from "@/components/elements/button-loading"
import { OpenExternalLink } from "@/components/typography/link-open-external"
import { cn } from "@/lib/classes"
import { LINKS } from "@/config/links"
import { formatScopeLabel, getPrimaryDataSourceLabel } from "@/lib/scope-labels"
import type { BuilderManifest, GrantSession } from "../../types"
import { ActionPanel } from "@/components/typography/button-action"
import { fieldHeight } from "@/components/typography/field"

// Note: `isApproving` maps to the "creating-grant" / "approving" states.
// The consent screen stays visible while the Allow button shows a loading spinner.
interface GrantConsentStateProps {
  session?: GrantSession
  builderManifest?: BuilderManifest
  builderName?: string
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

export function GrantConsentState({
  session,
  builderManifest,
  builderName,
  isApproving,
  onApprove,
  onDeny,
}: GrantConsentStateProps) {
  const dataSourceLabel = getPrimaryDataSourceLabel(session?.scopes)
  const dataLabel = dataSourceLabel ? `${dataSourceLabel} data` : "data"
  const scopeLabels = session?.scopes?.map(formatScopeLabel) ?? []
  const scopeActionLabel =
    scopeLabels.length === 0
      ? dataLabel
      : scopeLabels.length === 1
        ? scopeLabels[0]
        : scopeLabels.length === 2
          ? `${scopeLabels[0]} and ${scopeLabels[1]}`
          : `${scopeLabels.slice(0, -1).join(", ")}, and ${scopeLabels[scopeLabels.length - 1]}`
  const appName =
    builderName ?? builderManifest?.name ?? session?.appName ?? "this app"
  const builderIconSrc = pickBuilderIcon(builderManifest)
  const handleCancel = () => {
    if (isApproving) return
    if (onDeny) {
      onDeny()
    }
  }

  return (
    <div className="container pt-w16">
      <div className="space-y-w6">
        <PageHeading>Allow access to your {dataLabel}</PageHeading>
        <Text as="p">
          This will allow <strong>{appName}</strong> to:
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

        <div className="action-outset">
          <ActionPanel className="justify-start gap-w4">
            <div className="h-full flex items-center gap-1">
              <PlatformIcon
                iconName={dataSourceLabel ?? "Data"}
                aria-hidden="true"
              />
              <ArrowRightIcon aria-hidden="true" className="size-[1.5em]" />
              <PlatformIcon
                iconName={appName}
                imageSrc={builderIconSrc}
                aria-hidden="true"
              />
            </div>
            {/* Scope list */}
            <Text as="p" intent="button" weight="medium">
              See your {scopeActionLabel}
            </Text>
          </ActionPanel>
        </div>

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
            type="button"
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
            variant="accent"
            className={cn(fieldHeight.base, "w-[156px] disabled:opacity-100")}
          >
            Agree and Allow
          </LoadingButton>
        </div>

        {/* <hr /> */}
        {/* <div className="flex flex-col items-end gap-2">
          {builderLinks.length > 0 && (
            <Text as="p" intent="body" dim align="right">
              Read {appName}'s{" "}
              {builderLinks.map((link, index) => (
                <span key={link.label}>
                  <OpenExternalLink href={link.href}>
                    {link.label}
                  </OpenExternalLink>
                  {index < builderLinks.length - 2
                    ? ", "
                    : index === builderLinks.length - 2
                      ? " and "
                      : ""}
                </span>
              ))}
              .
            </Text>
          )}
          <GrantWarning align="right" />
        </div> */}
      </div>
    </div>
  )
}
