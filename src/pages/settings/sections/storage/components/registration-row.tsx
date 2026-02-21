import type { usePersonalServer } from "@/hooks/usePersonalServer"
import { Text } from "@/components/typography/text"
import { DEV_FLAGS } from "@/config/dev-flags"
import { Row, RowDot } from "./row"

/*
  RegistrationRow job:
  - Render a single line for "On-Chain Registration" in Settings.
  - Give the user a simple status label only.

  Important:
  - This is NOT authoritative on-chain proof yet.
  - Current mapping is a UI approximation from runtime state:
    - running + tunnel URL => Registered
    - error => Needs repair
    - otherwise => Not registered
*/
type ServerRuntimeStatus = ReturnType<typeof usePersonalServer>["status"]
type RegistrationState = "registered" | "error" | "pending"

interface RegistrationPresentation {
  dotClassName: string
  textClassName?: string
  label: string
}

const TEST_REGISTRATION_STATE: RegistrationState | null = null

interface RegistrationRowProps {
  status: ServerRuntimeStatus
  tunnelUrl: string | null
  isLast?: boolean
}

export function getRegistrationState(
  status: ServerRuntimeStatus,
  tunnelUrl: string | null
): RegistrationState {
  if (status === "error") return "error"
  if (status === "running" && tunnelUrl) return "registered"
  return "pending"
}

function getPreviewRegistrationState(
  status: ServerRuntimeStatus,
  tunnelUrl: string | null
): RegistrationState {
  const state = getRegistrationState(status, tunnelUrl)
  return DEV_FLAGS.useSettingsUiMocks && TEST_REGISTRATION_STATE
    ? TEST_REGISTRATION_STATE
    : state
}

function getRegistrationPresentation(
  state: RegistrationState
): RegistrationPresentation {
  switch (state) {
    case "registered":
      return {
        dotClassName: "bg-success-foreground",
        label: "Registered",
      }
    case "error":
      return {
        dotClassName: "bg-destructive-foreground",
        textClassName: "text-destructive-foreground",
        label: "Needs repair",
      }
    case "pending":
      return {
        dotClassName: "bg-amber-600",
        textClassName: "text-amber-600",
        label: "Not registered",
      }
    default: {
      const _never: never = state
      throw new Error(`Unhandled registration state: ${_never}`)
    }
  }
}

export function RegistrationRow({
  status,
  tunnelUrl,
  isLast = false,
}: RegistrationRowProps) {
  const registrationState = getPreviewRegistrationState(status, tunnelUrl)
  const registrationUi = getRegistrationPresentation(registrationState)

  return (
    <Row
      label="On-Chain Registration"
      labelInfo="Whether your Personal Server is registered on-chain as a protocol participant. This UI currently infers status from runtime signals and is not authoritative on-chain proof."
      isLast={isLast}
      value={
        <Text
          as="div"
          intent="small"
          dim={!registrationUi.textClassName}
          className={registrationUi.textClassName}
          withIcon
        >
          <RowDot className={registrationUi.dotClassName} />
          {registrationUi.label}
        </Text>
      }
    />
  )
}
