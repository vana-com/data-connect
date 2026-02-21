import { ChevronRight } from "lucide-react"
import { LoadingState } from "@/components/elements/loading-state"
import { EyebrowBadge } from "@/components/typography/eyebrow-badge"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { Spinner } from "@/components/elements/spinner"
import { Text } from "@/components/typography/text"
import { ActionButton } from "@/components/typography/button-action"
import { LearnMoreLink } from "@/components/typography/link-learn-more"
import { ButtonArrow } from "@/components/ui/button"
import { useConnectPage } from "./use-connect-page"

export function Connect() {
  const {
    connectTitle,
    connectCta,
    busyCta,
    dataSourceLabel,
    dataLabel,
    isAlreadyConnected,
    hasConnector,
    isBusy,
    isAutoRedirecting,
    connectorErrorMessage,
    showDebugBypass,
    handleConnect,
    handleDebugGrant,
  } = useConnectPage()

  if (isAutoRedirecting) return <LoadingState />

  return (
    <div className="container pt-major">
      <div className="space-y-w6">
        <Text as="h1" intent="title">
          {connectTitle}
        </Text>
        <Text as="p" intent="body">
          {isAlreadyConnected
            ? `You've already connected your ${dataLabel}. You can run it again to refresh.`
            : `This saves your ${dataLabel} to your computer.`}{" "}
          <LearnMoreLink />
        </Text>

        <div className="action-outset">
          <ActionButton
            size="xl"
            onClick={handleConnect}
            aria-busy={isBusy}
            disabled={!hasConnector || isBusy}
            className="relative gap-3 group disabled:opacity-100"
          >
            <PlatformIcon iconName={dataSourceLabel ?? "Data"} />
            <span>{isBusy ? busyCta : connectCta}</span>
            {!hasConnector && !isBusy ? (
              <EyebrowBadge
                variant="outline"
                className="text-foreground-dim ml-auto"
              >
                No connector
              </EyebrowBadge>
            ) : isBusy ? (
              <Spinner className="size-[1.5em] text-muted-foreground ml-auto" />
            ) : (
              <ButtonArrow
                icon={ChevronRight}
                className="size-[2em] text-muted-foreground group-hover:text-foreground"
                aria-hidden="true"
              />
            )}
          </ActionButton>
        </div>

        {connectorErrorMessage ? (
          <div className="space-y-1">
            <Text as="p" intent="small" color="destructive">
              {connectorErrorMessage}
            </Text>
            {showDebugBypass ? (
              <>
                <Text as="p" intent="small" color="destructive">
                  If you’re viewing this in a browser, connectors won’t load.
                  Use the Tauri app.
                </Text>
                <Text as="p" intent="small" color="destructive">
                  Need to bypass connectors?{" "}
                  <a className="link cursor-pointer" onClick={handleDebugGrant}>
                    Skip to grant step
                  </a>
                  .
                </Text>
              </>
            ) : null}
          </div>
        ) : null}

        {/* <div className="">
          <Link
            to={ROUTES.apps}
            className="link flex items-center gap-1.5 text-muted-foreground"
          >
            <ArrowLeftIcon aria-hidden="true" className="size-em" />
            Back to your Apps
          </Link>
        </div> */}
      </div>
    </div>
  )
}
