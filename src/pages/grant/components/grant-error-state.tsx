import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowRightIcon, HomeIcon, RotateCcwIcon, XIcon } from "lucide-react"
import { ActionButton } from "@/components/typography/button-action"
import { Text } from "@/components/typography/text"
import { PageHeading } from "@/components/typography/page-heading"
import { ButtonArrow } from "@/components/ui/button"
import { ROUTES } from "@/config/routes"

interface GrantErrorStateProps {
  error?: string
  declineHref: string
  onRetry?: () => void
}

export function GrantErrorState({
  error,
  declineHref,
  onRetry,
}: GrantErrorStateProps) {
  return (
    <div className="container pt-w16">
      <div className="space-y-w6">
        <PageHeading color="destructive" className="relative">
          {/* <div className="absolute left-[-1.3em] top-[0.05em]">
            <XIcon
              aria-hidden="true"
              className="size-8 [--lucide-stroke-width:2] text-destructive-foreground"
            />
          </div> */}
          Something went wrong
        </PageHeading>

        <Text as="p">{error || "Please try again."}</Text>

        {onRetry ? (
          <>
            <div className="action-outset">
              <GrantActionButton
                label="Try Again"
                onClick={onRetry}
                icon={<RotateCcwIcon aria-hidden="true" />}
              />
            </div>
            <div className="pt-px">
              <Text as={Link} to={ROUTES.home} dim link="default">
                Cancel and return Home
              </Text>
            </div>
          </>
        ) : (
          <div className="action-outset">
            <GrantActionButton
              asChild
              label="Return home"
              to={declineHref}
              icon={<HomeIcon aria-hidden="true" />}
            />
          </div>
        )}
      </div>
    </div>
  )
}

interface GrantActionButtonProps {
  label: string
  icon: ReactNode
  variant?: "default" | "outline"
  onClick?: () => void
  asChild?: boolean
  to?: string
}

function GrantActionButton({
  label,
  icon,
  variant = "outline",
  onClick,
  asChild = false,
  to,
}: GrantActionButtonProps) {
  const content = (
    <>
      <div className="size-8 flex items-center justify-center [&_svg]:size-6">
        {icon}
      </div>
      <span className="flex-1">{label}</span>
      <div className="pr-2">
        <ButtonArrow
          icon={ArrowRightIcon}
          aria-hidden="true"
          className="size-[1.75em] text-foreground-muted group-hover:text-foreground"
        />
      </div>
    </>
  )

  if (asChild && to) {
    return (
      <ActionButton
        asChild
        variant={variant}
        className="items-center gap-3 text-left"
      >
        <Link to={to}>{content}</Link>
      </ActionButton>
    )
  }

  return (
    <ActionButton
      type="button"
      variant={variant}
      onClick={onClick}
      className="items-center gap-3 text-left"
    >
      {content}
    </ActionButton>
  )
}
