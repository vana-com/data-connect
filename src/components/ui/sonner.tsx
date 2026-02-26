import { Toaster as SonnerToaster, type ToasterProps } from "sonner"

/* https://sonner.emilkowal.ski/toaster#api-reference */

export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      closeButton={false}
      expand
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "rounded-button border bg-background text-foreground shadow-lg !p-gap items-start",
          title: "text-small font-semibold",
          // description: "text-small text-muted-foreground",
          // cancelButton: "bg-muted text-foreground hover:bg-muted/80",
          actionButton: "ml-0!",
        },
      }}
      {...props}
    />
  )
}
