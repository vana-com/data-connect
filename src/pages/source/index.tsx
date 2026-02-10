import { Link, useParams } from "react-router-dom"
import { ArrowLeftIcon } from "lucide-react"
import { ROUTES } from "@/config/routes"

export function SourceOverview() {
  const { platformId } = useParams<{ platformId: string }>()

  return (
    <div className="container py-w16 space-y-w12">
      <Link
        to={ROUTES.home}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back
      </Link>
      <p className="text-6xl font-bold text-pink-500">
        TODO: Source overview page — {platformId}
      </p>
    </div>
  )
}
