import { Link } from "react-router-dom"
import { CheckIcon, UserRoundCogIcon, HomeIcon } from "lucide-react"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { ActionPanel } from "@/components/typography/button-action"
import { Text } from "@/components/typography/text"
import { getPrimaryDataSourceLabel } from "@/lib/scope-labels"
import { ROUTES } from "@/config/routes"

interface GrantSuccessStateProps {
  appName?: string
  scopes?: string[]
}

export function GrantSuccessState({ appName, scopes }: GrantSuccessStateProps) {
  const resolvedAppName = appName ?? "the app"
  const dataSourceLabel = getPrimaryDataSourceLabel(scopes)
  const dataLabel = dataSourceLabel ? `${dataSourceLabel} data` : "data"

  return (
    <div className="container pt-major">
      <div className="space-y-w6">
        <Text as="h1" intent="title" className="relative">
          <div className="absolute left-[-1.3em] top-[0.05em]">
            <CheckIcon
              className="size-9 [--lucide-stroke-width:2] text-accent"
              aria-hidden="true"
            />
          </div>
          {resolvedAppName} has your {dataLabel}
        </Text>

        <Text as="p">
          You can manage or revoke access in{" "}
          <Text as={Link} to={ROUTES.settings} link="default">
            Settings
          </Text>
          .
        </Text>

        {/* Purposely not wrapped in action-outset */}
        <ActionPanel className="gap-3 justify-start">
          <PlatformIcon iconName={appName ?? "App"} />
          Return to {resolvedAppName} to continue
        </ActionPanel>

        <div className="flex items-center gap-3 pt-0.5">
          <Text as={Link} to={ROUTES.settings} dim withIcon link="default">
            <UserRoundCogIcon aria-hidden="true" className="size-[1.1em]" />
            Manage account
          </Text>
          <Text as="span" dim>
            or
          </Text>
          <Text as={Link} to={ROUTES.home} dim withIcon link="default">
            <HomeIcon aria-hidden="true" className="size-[1.1em]" />
            return Home
          </Text>
        </div>
      </div>
    </div>
  )
}
