import type { usePersonalServer } from "@/hooks/usePersonalServer"
import { Text } from "@/components/typography/text"
import { DEV_FLAGS } from "@/config/dev-flags"
import { Row, RowDot } from "./row"

/*
  StatusRow job:
  - Show live runtime state of the local Personal Server process.
  - This is process health (running/starting/error/stopped), not on-chain registration.

  Why label popover exists:
  - Users can confuse runtime status with protocol registration status.
*/
type ServerRuntimeStatus = ReturnType<typeof usePersonalServer>["status"]
const TEST_SERVER_STATUS: ServerRuntimeStatus | null = null
const TEST_SERVER_PORT = 5488
const TEST_SERVER_ERROR = "Could not start server"

interface ServerStatusPresentation {
  dotClassName: string
  textClassName?: string
  label: string
}

interface StatusRowProps {
  status: ServerRuntimeStatus
  port: number | null
  error: string | null
}

function getPreviewStatusInputs(
  status: ServerRuntimeStatus,
  port: number | null,
  error: string | null
) {
  const previewStatus =
    DEV_FLAGS.useSettingsUiMocks && TEST_SERVER_STATUS
      ? TEST_SERVER_STATUS
      : status
  const previewPort = previewStatus === "running" ? TEST_SERVER_PORT : port
  const previewError = previewStatus === "error" ? TEST_SERVER_ERROR : error
  return {
    status: previewStatus,
    port: previewPort,
    error: previewError,
  }
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
  const previewInputs = getPreviewStatusInputs(status, port, error)
  const statusUi = getServerStatusPresentation(
    previewInputs.status,
    previewInputs.port,
    previewInputs.error
  )

  return (
    <Row
      label="Server status"
      labelInfo="Runtime health of your local Personal Server process (running, starting, stopped, or error). This is not on-chain registration state."
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
