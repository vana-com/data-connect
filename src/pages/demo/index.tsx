// Demo-only: scene index (no real-page equivalent)
import { Link } from "react-router-dom"
import { TopNav } from "@/components/top-nav"
import { Text } from "@/components/typography/text"

const DEMO_SCENES = [
  { path: "/demo/connect", label: "1. Connect" },
  { path: "/demo/auth", label: "2. Auth / Sign-in" },
  { path: "/demo/consent", label: "3. Grant Consent" },
  { path: "/demo/success", label: "4. Grant Success" },
] as const

export function DemoIndex() {
  return (
    <>
      <TopNav />
      <div className="container pt-major">
        <div className="space-y-w6">
          <Text as="h1" intent="title">
            Demo Flow
          </Text>
          <Text as="p" dim>
            Click through the grant flow. Start at step 1 or jump to any scene.
          </Text>

          <div className="space-y-2">
            {DEMO_SCENES.map(scene => (
              <Link
                key={scene.path}
                to={scene.path}
                className="link block text-body"
              >
                {scene.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
