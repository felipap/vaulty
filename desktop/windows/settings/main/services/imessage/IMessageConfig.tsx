import { useState, useEffect } from 'react'
import { IMessageExportConfig } from '../../../../electron'
import { FullDiskPermission } from '../FullDiskPermission'
import { HistoricalBackfill } from './HistoricalBackfill'

type Props = {
  onEnabledChange: (enabled: boolean) => void
}

const INTERVAL_OPTIONS = [
  { value: 1, label: 'Every 1 minute' },
  { value: 5, label: 'Every 5 minutes' },
  { value: 15, label: 'Every 15 minutes' },
  { value: 30, label: 'Every 30 minutes' },
  { value: 60, label: 'Every hour' },
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

function InfoIcon() {
  return (
    <svg
      className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function AttachmentNotice({ enabled }: { enabled: boolean }) {
  if (!enabled) {
    return null
  }
  return (
    <div className="flex gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
      <InfoIcon />
      <p className="text-sm text-blue-700 dark:text-blue-300">
        Only images (JPEG, PNG, GIF, HEIC) are uploaded. Videos and other
        attachments are skipped to save bandwidth.
      </p>
    </div>
  )
}

export function IMessageConfig({ onEnabledChange }: Props) {
  const [config, setConfig] = useState<IMessageExportConfig | null>(null)

  useEffect(() => {
    window.electron.getIMessageExportConfig().then(setConfig)
  }, [])

  const handleToggleEnabled = async () => {
    if (!config) {
      return
    }
    const newEnabled = !config.enabled
    await window.electron.setIMessageExportConfig({ enabled: newEnabled })
    setConfig({ ...config, enabled: newEnabled })
    onEnabledChange(newEnabled)
  }

  const handleToggleAttachments = async () => {
    if (!config) {
      return
    }
    const newValue = !config.includeAttachments
    await window.electron.setIMessageExportConfig({
      includeAttachments: newValue,
    })
    setConfig({ ...config, includeAttachments: newValue })
  }

  const handleIntervalChange = async (minutes: number) => {
    if (!config) {
      return
    }
    await window.electron.setIMessageExportConfig({ intervalMinutes: minutes })
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
        Export iMessage conversations to the server.
      </p>

      <FullDiskPermission description="iMessage export requires Full Disk Access to read your messages database." />

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Enable iMessage Export</span>
        <Toggle enabled={config.enabled} onChange={handleToggleEnabled} />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Sync image attachments</span>
        <Toggle
          enabled={config.includeAttachments}
          onChange={handleToggleAttachments}
        />
      </div>

      <AttachmentNotice enabled={config.includeAttachments} />

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

      <HistoricalBackfill />
    </div>
  )
}
