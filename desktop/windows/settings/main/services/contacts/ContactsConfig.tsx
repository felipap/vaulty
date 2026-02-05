import { useState, useEffect } from 'react'
import { ServiceConfig } from '../../../../electron'
import { FullDiskPermission } from '../FullDiskPermission'

type Props = {
  onEnabledChange: (enabled: boolean) => void
}

const INTERVAL_OPTIONS = [
  { value: 30, label: 'Every 30 minutes' },
  { value: 60, label: 'Every hour' },
  { value: 360, label: 'Every 6 hours' },
  { value: 720, label: 'Every 12 hours' },
  { value: 1440, label: 'Every 24 hours' },
]

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean
  onChange: () => void
}) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export function ContactsConfig({ onEnabledChange }: Props) {
  const [config, setConfig] = useState<ServiceConfig | null>(null)

  useEffect(() => {
    window.electron.getContactsSyncConfig().then(setConfig)
  }, [])

  const handleToggleEnabled = async () => {
    if (!config) {
      return
    }
    const newEnabled = !config.enabled
    await window.electron.setContactsSyncConfig({ enabled: newEnabled })
    setConfig({ ...config, enabled: newEnabled })
    onEnabledChange(newEnabled)
  }

  const handleIntervalChange = async (minutes: number) => {
    if (!config) {
      return
    }
    await window.electron.setContactsSyncConfig({ intervalMinutes: minutes })
    setConfig({ ...config, intervalMinutes: minutes })
  }

  if (!config) {
    return (
      <div className="animate-pulse h-32 bg-gray-200 dark:bg-gray-700 rounded" />
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-color-secondary)]">
        Sync your contacts to the server.
      </p>

      <FullDiskPermission description="Contacts sync requires Full Disk Access to read your contacts database." />

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Enable Contacts Sync</span>
        <Toggle enabled={config.enabled} onChange={handleToggleEnabled} />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Interval</label>
        <select
          value={config.intervalMinutes}
          onChange={(e) => handleIntervalChange(Number(e.target.value))}
          disabled={!config.enabled}
          className="w-full px-3 py-2 rounded-md border bg-[var(--background-color-three)] focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {INTERVAL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
