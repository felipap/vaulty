import { useState, useEffect } from 'react'
import { WhatsappUnipileConfig } from '../../../../shared-types'
import { withBoundary } from '../../../shared/ui/withBoundary'
import { DataSourceLogs } from '../../DataSourceLogs'
import { SyncTab, ToggleRow, IntervalSelect, LoadingSkeleton, useSyncLogs } from '../shared'

type Props = {
  onEnabledChange: (enabled: boolean) => void
  highlightSyncId?: string | null
}

const INTERVAL_OPTIONS = [
  { value: 1, label: 'Every 1 minute' },
  { value: 5, label: 'Every 5 minutes' },
  { value: 15, label: 'Every 15 minutes' },
  { value: 30, label: 'Every 30 minutes' },
  { value: 60, label: 'Every hour' },
]

export const WhatsappUnipileSyncTab = withBoundary(function WhatsappUnipileSyncTab({
  onEnabledChange,
  highlightSyncId,
}: Props) {
  const [config, setConfig] = useState<WhatsappUnipileConfig | null>(null)
  const [apiBaseUrl, setApiBaseUrl] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [accountId, setAccountId] = useState('')
  const logs = useSyncLogs('whatsapp-unipile')

  useEffect(() => {
    window.electron.getWhatsappUnipileConfig().then((c) => {
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
    await window.electron.setWhatsappUnipileConfig({ enabled: newEnabled })
    setConfig({ ...config, enabled: newEnabled })
    onEnabledChange(newEnabled)
  }

  const handleIntervalChange = async (minutes: number) => {
    if (!config) {
      return
    }
    await window.electron.setWhatsappUnipileConfig({ intervalMinutes: minutes })
    setConfig({ ...config, intervalMinutes: minutes })
  }

  const handleApiBaseUrlBlur = async () => {
    await window.electron.setWhatsappUnipileConfig({ apiBaseUrl })
    if (config) {
      setConfig({ ...config, apiBaseUrl })
    }
  }

  const handleApiTokenBlur = async () => {
    await window.electron.setWhatsappUnipileConfig({ apiToken })
    if (config) {
      setConfig({ ...config, apiToken })
    }
  }

  const handleAccountIdBlur = async () => {
    await window.electron.setWhatsappUnipileConfig({ accountId })
    if (config) {
      setConfig({ ...config, accountId })
    }
  }

  if (!config) {
    return <LoadingSkeleton />
  }

  const isConfigured = apiBaseUrl && apiToken && accountId

  return (
    <SyncTab
      title="WhatsApp (Unipile)"
      description="Sync WhatsApp messages via Unipile API."
      footer={
        <DataSourceLogs
          logs={logs}
          highlightSyncId={highlightSyncId}
          sourceLabel="WhatsApp (Unipile)"
        />
      }
    >
      {!isConfigured && (
        <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Configure your Unipile API credentials below to enable WhatsApp
            sync.
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
          <label className="block text-sm font-medium mb-1.5">API Token</label>
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
          <label className="block text-sm font-medium mb-1.5">Account ID</label>
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

      <ToggleRow
        label="Enable WhatsApp Sync"
        enabled={config.enabled}
        onChange={handleToggleEnabled}
      />

      <IntervalSelect
        value={config.intervalMinutes}
        options={INTERVAL_OPTIONS}
        onChange={handleIntervalChange}
        disabled={!config.enabled}
      />
    </SyncTab>
  )
})
