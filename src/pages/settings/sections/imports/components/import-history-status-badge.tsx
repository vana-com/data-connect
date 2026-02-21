import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SquareIcon,
} from "lucide-react"
import { EyebrowBadge } from "@/components/typography/eyebrow-badge"
import { cn } from "@/lib/classes"
import type { Run } from "@/types"
import {
  finishedImportStatusBadgeClasses,
  getStatusLabel,
} from "./import-history-row-utils"

interface ImportHistoryStatusBadgeProps {
  run: Run
  isErrorExpanded: boolean
  onToggleErrorDetail: () => void
}

export function ImportHistoryStatusBadge({
  run,
  isErrorExpanded,
  onToggleErrorDetail,
}: ImportHistoryStatusBadgeProps) {
  const statusLabel = getStatusLabel(run.status)

  if (run.status === "error") {
    return (
      <button
        type="button"
        onClick={onToggleErrorDetail}
        aria-expanded={isErrorExpanded}
        aria-label={`${isErrorExpanded ? "Hide" : "Show"} failed run details`}
        className="rounded-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <EyebrowBadge
          variant="outline"
          className={cn(
            "pr-1 cursor-pointer",
            finishedImportStatusBadgeClasses.error
          )}
          textProps={{
            withIcon: true,
            className: "[&_svg]:size-3.5!",
          }}
        >
          <>
            {statusLabel}
            {isErrorExpanded ? (
              <ChevronUpIcon aria-hidden="true" />
            ) : (
              <ChevronDownIcon aria-hidden="true" />
            )}
          </>
        </EyebrowBadge>
      </button>
    )
  }

  const isSuccess = run.status === "success"
  const isStopped = run.status === "stopped"
  const finalStatusLabel = isSuccess ? (
    <>
      <CheckIcon aria-hidden="true" />
      {statusLabel}
    </>
  ) : isStopped ? (
    <>
      <SquareIcon aria-hidden="true" />
      {statusLabel}
    </>
  ) : (
    statusLabel
  )

  return (
    <EyebrowBadge
      variant="outline"
      className={cn(
        (isSuccess || isStopped) && "pl-1",
        isSuccess
          ? finishedImportStatusBadgeClasses.success
          : isStopped
            ? finishedImportStatusBadgeClasses.stopped
            : finishedImportStatusBadgeClasses.default
      )}
      textProps={
        isSuccess || isStopped
          ? {
              withIcon: true,
              className: "[&_svg]:!size-3.5",
            }
          : undefined
      }
    >
      {finalStatusLabel}
    </EyebrowBadge>
  )
}
