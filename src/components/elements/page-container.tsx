import { cn } from "@/lib/utils"

export const PAGE_CONTAINER_PT_CLASS = "pt-w12"

interface PageContainerProps {
  children: React.ReactNode
  className?: string
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("container pt-w12 pb-w24", className)}>{children}</div>
  )
}
