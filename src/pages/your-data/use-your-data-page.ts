import { useMemo, useState } from "react"
import { useSelector } from "react-redux"
import { useNavigate } from "react-router"
import { usePlatforms } from "@/hooks/usePlatforms"
import type { RootState } from "@/state/store"
import type { TabKey } from "./types"

export function useYourDataPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>("sources")
  const { platforms } = usePlatforms()
  const connectedPlatforms = useSelector(
    (state: RootState) => state.app.connectedPlatforms
  )

  const connectedSources = useMemo(
    () => platforms.filter(p => connectedPlatforms[p.id]),
    [platforms, connectedPlatforms]
  )

  const availableSources = useMemo(
    () => platforms.filter(p => !connectedPlatforms[p.id]),
    [platforms, connectedPlatforms]
  )

  const handleConnectSource = (platformId: string) => {
    navigate(`/?platform=${platformId}`)
  }

  const handleViewRuns = () => {
    navigate("/runs")
  }

  return {
    activeTab,
    setActiveTab,
    connectedSources,
    availableSources,
    handleConnectSource,
    handleViewRuns,
  }
}
