import type { usePersonalServer } from "@/hooks/usePersonalServer"
import { Text } from "@/components/typography/text"
import { Row, RowDot } from "./row"

/* Duplicate of storage/components/status-row.tsx */

type ServerRuntimeStatus = ReturnType<typeof usePersonalServer>["status"]

interface StatusRowProps {
  status: ServerRuntimeStatus
  port: number | null
  error: string | null
}

interface ServerStatusPresentation {
  dotClassName: string
  textClassName?: string
  label: string
}

function getServerStatusPresentation(
  status: ServerRuntimeStatus,
  port: number | null,
  error: string | null
): ServerStatusPresentation {
  switch (status) {
    case "running":
      return {
        dotClassName: "bg-success-foreground",
        label: `Running on port ${port ?? "?"}`,
      }
    case "starting":
      return {
        dotClassName: "bg-amber-600",
        label: "Starting",
      }
    case "error":
      return {
        dotClassName: "bg-destructive-foreground",
        textClassName: "text-destructive-foreground",
        label: error || "Error",
      }
    case "stopped":
      return {
        dotClassName: "bg-destructive-foreground",
        textClassName: "text-destructive-foreground",
        label: "Stopped",
      }
    default: {
      const _never: never = status
      throw new Error(`Unhandled server runtime status: ${_never}`)
    }
  }
}

export function StatusRow({ status, port, error }: StatusRowProps) {
  const statusUi = getServerStatusPresentation(status, port, error)

  return (
    <Row
      label="Server status"
      labelInfo="Runtime health of your local Personal Server process (running, starting, stopped, or error)."
      value={
        <Text
          as="div"
          intent="small"
          dim
          withIcon
          className={statusUi.textClassName}
        >
          <RowDot className={statusUi.dotClassName} />
          {statusUi.label}
        </Text>
      }
    />
  )
}
