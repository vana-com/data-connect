import { useNavigate } from "react-router-dom"
import { ButtonSignInVana } from "@/components/elements/button-sign-in-vana"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/classes"
import { ROUTES } from "@/config/routes"

export function RickrollMockRoot() {
  const navigate = useNavigate()
  const signInHref = ROUTES.rickrollMockSignIn

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      <div
        className={cn(
          // layout
          "container flex min-h-screen items-center justify-center",
          // spacing
          "pt-major"
        )}
      >
        <div className="space-y-gap">
          <Text as="h1" intent="title">
            RickRoll Demo App
          </Text>
          <ButtonSignInVana
            size="lg"
            fullWidth
            showArrow
            onClick={() => navigate(signInHref)}
          />
        </div>
      </div>
    </div>
  )
}
