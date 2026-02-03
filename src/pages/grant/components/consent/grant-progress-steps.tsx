import type { GrantStep } from "../../types"
import { Text } from "@/components/typography/text"

interface GrantProgressStepsProps {
  currentStep: GrantStep
}

export function GrantProgressSteps({ currentStep }: GrantProgressStepsProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {[1, 2, 3].map(step => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={
              currentStep >= step
                ? "flex size-8 items-center justify-center rounded-full bg-accent text-background"
                : "flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
            }
          >
            <Text as="span" intent="small" weight="semi" color="inherit">
              {step}
            </Text>
          </div>
          {step < 3 && (
            <div
              className={currentStep > step ? "h-0.5 w-6 bg-accent" : "h-0.5 w-6 bg-border"}
            />
          )}
        </div>
      ))}
    </div>
  )
}
