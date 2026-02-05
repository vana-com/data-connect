import { Link, useSearchParams } from "react-router-dom"
import { ArrowLeftIcon, ArrowRightIcon, ImportIcon } from "lucide-react"
import { Button, ButtonArrow } from "@/components/ui/button"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/classes"
import { ROUTES } from "@/config/routes"
import { DcIcon } from "@/components/icons/dc-icon"
import { DcLogotype } from "@/components/icons/dc-logotype"
import { fieldHeight } from "@/components/typography/field"

export function RickrollMockSignIn() {
  const [searchParams] = useSearchParams()
  const search = searchParams.toString()
  const backHref = search
    ? `${ROUTES.rickrollMockRoot}?${search}`
    : ROUTES.rickrollMockRoot
  const deepLink = search ? `dataconnect://?${search}` : "dataconnect://"
  const connectHref = search ? `${ROUTES.connect}?${search}` : ROUTES.connect

  // In dev, use the connect page; in prod, use the deep link
  const launchHref = import.meta.env.DEV ? connectHref : deepLink

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      <div className={cn("p-w8 flex min-h-screen flex-col")}>
        <Link
          to={backHref}
          className={cn(
            "inline-flex items-center gap-1.5",
            "text-muted-foreground",
            "transition-colors hover:text-foreground"
          )}
        >
          <ArrowLeftIcon aria-hidden="true" className="size-em" />
          Back
        </Link>

        <div className="flex flex-1 items-center justify-center">
          <div
            className={cn(
              "w-full max-w-[560px]",
              "rounded-squish ring ring-border",
              "bg-background px-small py-small",
              "text-center space-y-small"
            )}
          >
            <div className="space-y-0">
              <Text as="h1" intent="title" weight="semi">
                Connect your data.
              </Text>
              <Text
                as="h2"
                intent="title"
                color="mutedForeground"
                className="mt-0"
              >
                Bring it everywhere.
              </Text>
            </div>

            {/* Download button */}
            <button
              type="button"
              className={cn(
                "lg:w-3/4 mx-auto",
                "flex flex-col items-center",
                "rounded-card border border-foreground",
                "px-w6 group hover:bg-muted cursor-pointer"
              )}
            >
              <div className="flex flex-col items-center gap-gap py-gap">
                <div
                  className={cn(
                    "size-16",
                    "flex items-center justify-center",
                    "rounded-button",
                    "bg-foreground shadow-sm"
                  )}
                >
                  <DcIcon className="size-12!" />
                </div>
                <DcLogotype height={13} aria-hidden />
              </div>
              <hr className="w-full border-input" />
              <Text
                intent="button"
                weight="medium"
                withIcon
                className={cn(fieldHeight.lg)}
              >
                <ImportIcon className="size-[1.25em]" />
                Download for macOS
              </Text>
            </button>

            {/* Deep link button */}
            <div className="lg:w-3/4 mx-auto space-y-gap">
              <Text as="p">Already have Data Connect?</Text>
              <Button asChild size="xl" fullWidth>
                <a href={launchHref}>
                  <DcIcon className="size-[1.5em]!" />
                  Launch Data Connect
                  <ButtonArrow icon={ArrowRightIcon} className="ms-0" />
                </a>
              </Button>
            </div>

            <div className="pt-2 lg:w-5/6 mx-auto">
              <Text as="p" intent="small" align="center" muted>
                To continue, you will share your name and your ChatGPT data with
                RickRoll. Before using this app, you can review RickRoll&apos;s{" "}
                <a className="link hover:text-foreground" href="#">
                  privacy policy
                </a>{" "}
                and{" "}
                <a className="link hover:text-foreground" href="#">
                  terms of service
                </a>
                .
              </Text>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
