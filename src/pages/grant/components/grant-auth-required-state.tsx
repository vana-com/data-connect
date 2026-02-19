import type { MouseEvent } from "react"
import { Link } from "react-router-dom"
import { ArrowUpRightIcon } from "lucide-react"
import { Text } from "@/components/typography/text"
import { ActionButton } from "@/components/typography/button-action"
import { ButtonArrow } from "@/components/ui/button"
import { openExternalUrl } from "@/lib/open-resource"
import { VanaV } from "@/components/icons/vana-v"
import { ROUTES } from "@/config/routes"

interface GrantAuthRequiredStateProps {
  appName?: string
  authUrl: string | null
  authError: string | null
  onRetryAuth: () => void
  onDeny?: () => void
}

export function GrantAuthRequiredState({
  appName,
  authUrl,
  authError,
  onRetryAuth,
  onDeny,
}: GrantAuthRequiredStateProps) {
  const handleCancelLinkClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onDeny) return
    event.preventDefault()
    onDeny()
  }

  return (
    <div className="container pt-major">
      <div className="space-y-w6">
        <Text as="h1" intent="title">
          Sign in to continue
        </Text>
        <Text as="p">
          Sign in with Vana Passport to grant {appName ?? "this app"} access to
          your data.
        </Text>

        {authError && (
          <Text as="p" intent="small" color="destructive">
            {authError}
          </Text>
        )}

        {authUrl ? (
          <AuthActionButton
            label="Open Vana Passport"
            onClick={() => openExternalUrl(authUrl)}
          />
        ) : (
          <AuthActionButton
            label="Try Opening Sign-In Again"
            onClick={onRetryAuth}
          />
        )}

        <div className="flex items-center gap-3 pt-0.5">
          <Text
            as={Link}
            to={ROUTES.home}
            dim
            withIcon
            link="default"
            onClick={handleCancelLinkClick}
          >
            Cancel and return Home
          </Text>
        </div>
      </div>
    </div>
  )
}

interface AuthActionButtonProps {
  label: string
  onClick: () => void
}

function AuthActionButton({ label, onClick }: AuthActionButtonProps) {
  return (
    <ActionButton
      type="button"
      onClick={onClick}
      className="items-center gap-3 text-left"
    >
      {/* <div className="size-8 flex items-center justify-center [&_svg]:size-6">
        <KeyRoundIcon aria-hidden="true" />
      </div> */}
      <div className="p-1">
        <div className="border border-current p-0.75 rounded-soft">
          <VanaV aria-hidden="true" className="size-[18px]!" />
        </div>
      </div>
      <span className="flex-1">{label}</span>
      <ButtonArrow
        icon={ArrowUpRightIcon}
        aria-hidden="true"
        className="size-[2em] text-foreground-muted group-hover:text-foreground"
      />
    </ActionButton>
  )
}
