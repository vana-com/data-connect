import { PageContainer } from "@/components/elements/page-container"
import { actionButtonSurfaceClass } from "@/components/typography/button-action"
import { fieldHeight } from "@/components/typography/field"
import { LearnMoreLink } from "@/components/typography/link-learn-more"
import { Text } from "@/components/typography/text"
import { buttonVariants } from "@/components/ui/button"
import { LINKS } from "@/config/links"
import { cn } from "@/lib/classes"
import { openExternalUrl } from "@/lib/open-resource"
import { ArrowUpRightIcon, AsteriskIcon, ChevronRightIcon } from "lucide-react"

// TODO: Implement actual data apps list!
// App card if you need it = import { AppCard } from "./components/AppCard"

export function DataApps() {
  const placeholderCards = Array.from({ length: 6 }, (_, index) => index)
  const handleOpenAppBuilder = () => {
    void openExternalUrl(LINKS.appBuilderExample)
  }

  return (
    <PageContainer className="space-y-w12">
      {/* sticky top-[76px] z-10 */}
      <div className="space-y-2">
        <Text as="h1" intent="subtitle" weight="medium">
          Data Apps
        </Text>
        <Text as="p" intent="small" dim>
          Create apps with the Vana Data Protocol.&nbsp;
          <LearnMoreLink
            href={LINKS.vanaDocsProtocol}
            className="inline-flex items-center gap-px!"
          >
            Learn more
            <ArrowUpRightIcon aria-hidden="true" className="size-em" />
          </LearnMoreLink>
        </Text>
      </div>

      <section className="lg:-mx-w48">
        <div className="grid gap-w4 md:grid-cols-2 2xl:grid-cols-3">
          {placeholderCards.map(index => {
            const cardClassName = cn(
              buttonVariants({
                variant: "outline",
                size: "xl",
                fullWidth: true,
              }),
              "min-h-[220px] min-w-0 whitespace-normal p-0! items-start!",
              index === 0
                ? actionButtonSurfaceClass
                : "bg-background/30! hover:border-ring/20 cursor-default p-0 transition-none"
            )

            const cardContent =
              index === 0 ? (
                <div className="w-full h-full flex-1 flex flex-col">
                  <div className="p-4 space-y-1.5">
                    <div className="p-1">
                      <div className="shrink-0 size-8 bg-foreground rounded-button flex items-center justify-center">
                        <AsteriskIcon className="size-6 text-background" />
                      </div>
                    </div>
                    <Text as="h3" intent="heading" weight="medium">
                      Add your app here
                    </Text>
                    <Text
                      as="p"
                      intent="small"
                      dim
                      balance
                      className="whitespace-normal"
                    >
                      Build apps with deep personal context for smarter
                      experiences, for users and agents alike.
                    </Text>
                  </div>
                  <div className="mt-auto">
                    <div
                      className={cn(
                        "flex w-full items-center justify-between border-t text-left",
                        fieldHeight.default,
                        "px-4"
                      )}
                    >
                      <Text
                        as="span"
                        intent="button"
                        weight="medium"
                        truncate
                        align="left"
                      >
                        Coming soon
                      </Text>
                      <div className="flex items-center gap-2 self-end h-full">
                        <ChevronRightIcon
                          className={cn("size-5 text-foreground-muted")}
                          aria-hidden
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null

            if (index === 0) {
              return (
                <button
                  key={index}
                  type="button"
                  onClick={handleOpenAppBuilder}
                  aria-label="Open app builder registration"
                  className={cn(cardClassName, "text-left")}
                >
                  {cardContent}
                </button>
              )
            }

            return (
              <div key={index} className={cardClassName}>
                {cardContent}
              </div>
            )
          })}
        </div>
      </section>
    </PageContainer>
  )
}
