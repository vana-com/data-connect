import type { ReactNode } from "react"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/classes"
import { SettingsRow } from "./settings-row"
import { SettingsRowDivider } from "./settings-row-divider"

export interface SettingsSingleSelectRowOption<T extends string = string> {
  id: T
  label: ReactNode
  description: ReactNode
  available?: boolean
}

interface SettingsSingleSelectRowGroupProps<T extends string> {
  options: readonly SettingsSingleSelectRowOption<T>[]
  value: T | null
  onChange: (nextValue: T | null) => void
  ariaLabel: string
  renderRight?: (
    item: SettingsSingleSelectRowOption<T>,
    selected: boolean
  ) => ReactNode
}

export function SettingsSingleSelectRowGroup<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  renderRight,
}: SettingsSingleSelectRowGroupProps<T>) {
  // Custom radiogroup (not ShadCN/Radix RadioGroup):
  // we need nullable single-select,
  // so users can click the selected option again to clear back to "none".
  return (
    <div
      data-component="settings-single-select-row-group"
      role="radiogroup"
      aria-label={ariaLabel}
      className="border-t border-border"
    >
      {options.map((item, index) => {
        const selected = value === item.id
        const disabled = item.available === false
        const radioContainerClass = cn(
          disabled ? "bg-muted/50" : selected ? "bg-muted" : "bg-muted"
        )
        // const radioContainerClass = ""
        const radioClass = cn(
          "relative size-5 rounded-full border",
          disabled
            ? "border-ring/50"
            : selected
              ? "border-foreground"
              : "border-ring"
        )

        return (
          <div key={item.id}>
            {index > 0 && <SettingsRowDivider />}
            <div
              role="radio"
              aria-checked={selected}
              aria-disabled={disabled}
              tabIndex={disabled ? -1 : 0}
              className={cn("w-full text-left", !disabled && "cursor-pointer")}
              onClick={() => {
                if (disabled) return
                onChange(selected ? null : item.id)
              }}
              onKeyDown={event => {
                if (disabled) return
                if (event.key === " " || event.key === "Enter") {
                  event.preventDefault()
                  onChange(selected ? null : item.id)
                }
              }}
            >
              <SettingsRow
                iconContainerClassName={radioContainerClass}
                icon={
                  <span aria-hidden="true" className={radioClass}>
                    {selected ? (
                      <span className="absolute inset-0.5 rounded-full bg-foreground" />
                    ) : null}
                  </span>
                }
                title={
                  <Text as="div" intent="body" weight="semi" muted={disabled}>
                    {item.label}
                  </Text>
                }
                description={
                  <Text
                    as="div"
                    intent="small"
                    muted={disabled}
                    dim={!disabled}
                  >
                    {item.description}
                  </Text>
                }
                right={renderRight?.(item, selected)}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
