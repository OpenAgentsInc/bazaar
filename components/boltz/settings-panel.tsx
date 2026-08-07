"use client"

import { ShieldCheckIcon } from "lucide-react"

import { Switch } from "@/components/ui/switch"

function SettingRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  const id = `boltz-setting-${title.toLowerCase().replaceAll(" ", "-")}`
  return (
    <div className="flex items-start justify-between gap-5 py-3">
      <div>
        <label
          htmlFor={id}
          className="block cursor-pointer text-xs font-semibold text-foreground"
        >
          {title}
        </label>
        <p
          id={`${id}-description`}
          className="mt-0.5 max-w-sm text-[0.6875rem] leading-4 text-muted-foreground"
        >
          {description}
        </p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-describedby={`${id}-description`}
      />
    </div>
  )
}

export function BoltzSettingsPanel({
  bitcoinOnly,
  zeroConf,
  privacyMode,
  onBitcoinOnlyChange,
  onZeroConfChange,
  onPrivacyModeChange,
}: {
  bitcoinOnly: boolean
  zeroConf: boolean
  privacyMode: boolean
  onBitcoinOnlyChange: (checked: boolean) => void
  onZeroConfChange: (checked: boolean) => void
  onPrivacyModeChange: (checked: boolean) => void
}) {
  return (
    <section
      className="rounded-xl border border-border bg-card p-4"
      aria-labelledby="boltz-settings-title"
    >
      <div className="flex items-start gap-2 border-b border-border pb-3">
        <ShieldCheckIcon className="mt-0.5 size-4 text-primary" />
        <div>
          <h3
            id="boltz-settings-title"
            className="text-sm font-semibold text-foreground"
          >
            Swap settings
          </h3>
          <p className="text-[0.6875rem] text-muted-foreground">
            Security-sensitive choices stay explicit.
          </p>
        </div>
      </div>
      <div className="divide-y divide-border">
        <SettingRow
          title="Bitcoin only"
          description="Hide Liquid settlement routes from asset selection."
          checked={bitcoinOnly}
          onCheckedChange={onBitcoinOnlyChange}
        />
        <SettingRow
          title="Accept zero-conf"
          description="Allow eligible low-value swaps before a block confirmation."
          checked={zeroConf}
          onCheckedChange={onZeroConfChange}
        />
        <SettingRow
          title="Privacy mode"
          description="Obscure swap amounts and identifiers in history."
          checked={privacyMode}
          onCheckedChange={onPrivacyModeChange}
        />
      </div>
    </section>
  )
}
