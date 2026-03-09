import { ChevronRight } from "lucide-react"
import { PageContainer } from "@/components/elements/page-container"
import { LoadingState } from "@/components/elements/loading-state"
import { EyebrowBadge } from "@/components/typography/eyebrow-badge"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { Spinner } from "@/components/elements/spinner"
import { Text } from "@/components/typography/text"
import { PageHeading } from "@/components/typography/page-heading"
import { ActionButton } from "@/components/typography/button-action"
import { LearnMoreLink } from "@/components/typography/link-learn-more"
import { ButtonArrow } from "@/components/ui/button"
import { useConnectPage } from "./use-connect-page"
import { ConnectDebugPanel } from "./components/connect-debug-panel"

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
    debugState,
    debugScopes,
    setDebugState,
  } = useConnectPage()

  const isDev = import.meta.env.DEV
  const content = isAutoRedirecting ? (
    <LoadingState />
  ) : (
    <PageContainer>
      <div className="space-y-w6">
        <PageHeading>{connectTitle}</PageHeading>
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
              <div className="size-[2em] flex items-center justify-center ml-auto">
                <Spinner className="size-5! text-muted-foreground" />
              </div>
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
    </PageContainer>
  )

  return (
    <>
      {content}
      {isDev ? (
        <ConnectDebugPanel
          activeState={debugState}
          dataSourceLabel={dataSourceLabel ?? "ChatGPT"}
          scopes={debugScopes}
          onChangeState={setDebugState}
        />
      ) : null}
    </>
  )
}
