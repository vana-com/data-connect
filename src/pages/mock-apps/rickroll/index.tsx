import { Link, useSearchParams } from "react-router-dom"
import { Button, ButtonArrow } from "@/components/ui/button"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/classes"
import { ROUTES } from "@/config/routes"
import { ArrowRightIcon } from "lucide-react"

export function RickrollMockRoot() {
  const [searchParams] = useSearchParams()
  const search = searchParams.toString()
  const signInHref = search
    ? `${ROUTES.rickrollMockSignIn}?${search}`
    : ROUTES.rickrollMockSignIn

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      <div
        className={cn(
          // layout
          "container flex min-h-screen items-center justify-center",
          // spacing
          "py-w24"
        )}
      >
        <div className="space-y-gap">
          <Text as="h1" intent="title">
            RickRoll Demo App
          </Text>
          <Button asChild size="lg" fullWidth>
            <Link to={signInHref}>
              Sign in with Vana
              <ButtonArrow icon={ArrowRightIcon} className="ms-0" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
