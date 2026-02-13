import { Link, useNavigate } from "react-router-dom"
import { CheckIcon, UserRoundCogIcon } from "lucide-react"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { ActionPanel } from "@/components/typography/button-action"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/typography/text"
import { getPrimaryDataSourceLabel } from "@/lib/scope-labels"
import { ROUTES } from "@/config/routes"

interface GrantSuccessStateProps {
  appName?: string
  scopes?: string[]
}

export function GrantSuccessState({ appName, scopes }: GrantSuccessStateProps) {
  const navigate = useNavigate()
  const resolvedAppName = appName ?? "the app"
  const dataSourceLabel = getPrimaryDataSourceLabel(scopes)
  const dataLabel = dataSourceLabel ? `${dataSourceLabel} data` : "data"

  return (
    <div className="container py-w24">
      <div className="space-y-w6">
        <Text as="h1" intent="title" className="relative">
          <div className="absolute left-[-1.3em] top-[0.05em]">
            <CheckIcon
              className="size-9 text-success"
              aria-hidden="true"
              strokeWidth={2.5}
            />
          </div>
          {resolvedAppName} has your {dataLabel}
        </Text>

        <Text as="p">
          You can manage or revoke access in{" "}
          <Text as={Link} to="/settings" link="default">
            Settings
          </Text>
          .
        </Text>

        <div className="action-outset">
          <ActionPanel className="gap-3 justify-start">
            <PlatformIcon iconName={appName ?? "App"} />
            Return to {resolvedAppName} to continue
          </ActionPanel>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => navigate(ROUTES.home)}
          >
            Done
          </Button>
          <Text as={Link} to="/settings" dim withIcon link="default">
            <UserRoundCogIcon aria-hidden="true" className="size-[1.1em]" />
            Manage your account
          </Text>
        </div>
      </div>
    </div>
  )
}
