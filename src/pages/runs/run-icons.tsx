import {
  ActivityIcon,
  CheckCircleIcon,
  Loader2Icon,
  SquareIcon,
  UploadIcon,
  XCircleIcon,
} from "lucide-react"
import type { Run } from "../../types"
import type { IngestStatus } from "./run-utils"

export const getRunStatusIcon = (status: Run["status"]) => {
  switch (status) {
    case "running":
      return (
        <Loader2Icon
          aria-hidden="true"
          className="size-5 animate-spin text-accent motion-reduce:animate-none"
        />
      )
    case "success":
      return <CheckCircleIcon aria-hidden="true" className="size-5 text-success" />
    case "error":
      return <XCircleIcon aria-hidden="true" className="size-5 text-destructive" />
    case "stopped":
      return <SquareIcon aria-hidden="true" className="size-5 text-muted-foreground" />
    default:
      return <ActivityIcon aria-hidden="true" className="size-5 text-muted-foreground" />
  }
}

export const getIngestStatusIcon = (status: IngestStatus) => {
  if (status === "sending") {
    return (
      <Loader2Icon
        aria-hidden="true"
        className="size-4 animate-spin motion-reduce:animate-none"
      />
    )
  }
  if (status === "sent") {
    return <CheckCircleIcon aria-hidden="true" className="size-4" />
  }
  return <UploadIcon aria-hidden="true" className="size-4" />
}
