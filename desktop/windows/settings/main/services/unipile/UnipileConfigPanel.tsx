import { useState, useEffect } from 'react'
import { UnipileWhatsappConfig } from '../../../../../shared-types'

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

export function UnipileConfigPanel({ onEnabledChange }: Props) {
  const [config, setConfig] = useState<UnipileWhatsappConfig | null>(null)
  const [apiBaseUrl, setApiBaseUrl] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [accountId, setAccountId] = useState('')

  useEffect(() => {
    window.electron.getUnipileWhatsappConfig().then((c) => {
      setConfig(c)
      setApiBaseUrl(c.apiBaseUrl ?? '')
      setApiToken(c.apiToken ?? '')
      setAccountId(c.accountId ?? '')
    })
  }, [])

  const handleToggleEnabled = async () => {
    if (!config) {
      return
    }
    const newEnabled = !config.enabled
    await window.electron.setUnipileWhatsappConfig({ enabled: newEnabled })
    setConfig({ ...config, enabled: newEnabled })
    onEnabledChange(newEnabled)
  }

  const handleIntervalChange = async (minutes: number) => {
    if (!config) {
      return
    }
    await window.electron.setUnipileWhatsappConfig({ intervalMinutes: minutes })
    setConfig({ ...config, intervalMinutes: minutes })
  }

  const handleApiBaseUrlBlur = async () => {
    await window.electron.setUnipileWhatsappConfig({ apiBaseUrl })
    if (config) {
      setConfig({ ...config, apiBaseUrl })
    }
  }

  const handleApiTokenBlur = async () => {
    await window.electron.setUnipileWhatsappConfig({ apiToken })
    if (config) {
      setConfig({ ...config, apiToken })
    }
  }

  const handleAccountIdBlur = async () => {
    await window.electron.setUnipileWhatsappConfig({ accountId })
    if (config) {
      setConfig({ ...config, accountId })
    }
  }

  if (!config) {
    return (
      <div className="animate-pulse h-32 bg-gray-200 dark:bg-gray-700 rounded" />
    )
  }

  const isConfigured = apiBaseUrl && apiToken && accountId

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-color-secondary)]">
        Sync WhatsApp messages via Unipile API.
      </p>

      {!isConfigured && (
        <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Configure your Unipile API credentials below to enable WhatsApp sync.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">
            API Base URL
          </label>
          <input
            type="url"
            value={apiBaseUrl}
            onChange={(e) => setApiBaseUrl(e.target.value)}
            onBlur={handleApiBaseUrlBlur}
            className="w-full px-3 py-2 rounded-md border bg-[var(--background-color-three)] focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://api16.unipile.com:14645"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            API Token
          </label>
          <input
            type="password"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            onBlur={handleApiTokenBlur}
            className="w-full px-3 py-2 rounded-md border bg-[var(--background-color-three)] focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Your Unipile API token"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Account ID
          </label>
          <input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            onBlur={handleAccountIdBlur}
            className="w-full px-3 py-2 rounded-md border bg-[var(--background-color-three)] focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Your Unipile account ID"
          />
          <p className="text-xs text-[var(--text-color-secondary)] mt-1">
            The account ID for the connected WhatsApp account in Unipile.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Enable WhatsApp Sync</span>
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
