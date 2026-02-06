import { useState, useEffect } from 'react'
import { WhatsappSqliteConfig } from '../../../../shared-types'
import { FullDiskPermission } from '../FullDiskPermission'
import { HistoricalBackfill } from './HistoricalBackfill'
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

export const WhatsappSqliteSyncTab = withBoundary(function WhatsappSqliteSyncTab({
  onEnabledChange,
  highlightSyncId,
}: Props) {
  const [config, setConfig] = useState<WhatsappSqliteConfig | null>(null)
  const [newIgnoredId, setNewIgnoredId] = useState('')
  const logs = useSyncLogs('whatsapp-sqlite')

  useEffect(() => {
    window.electron.getWhatsappSqliteConfig().then(setConfig)
  }, [])

  const handleToggleEnabled = async () => {
    if (!config) {
      return
    }
    const newEnabled = !config.enabled
    await window.electron.setWhatsappSqliteConfig({ enabled: newEnabled })
    setConfig({ ...config, enabled: newEnabled })
    onEnabledChange(newEnabled)
  }

  const handleIntervalChange = async (minutes: number) => {
    if (!config) {
      return
    }
    await window.electron.setWhatsappSqliteConfig({ intervalMinutes: minutes })
    setConfig({ ...config, intervalMinutes: minutes })
  }

  const handleAddIgnoredId = async () => {
    if (!config || !newIgnoredId.trim()) {
      return
    }
    const id = newIgnoredId.trim()
    if (config.ignoredChatIds.includes(id)) {
      setNewIgnoredId('')
      return
    }
    const updatedIds = [...config.ignoredChatIds, id]
    await window.electron.setWhatsappSqliteConfig({
      ignoredChatIds: updatedIds,
    })
    setConfig({ ...config, ignoredChatIds: updatedIds })
    setNewIgnoredId('')
  }

  const handleRemoveIgnoredId = async (id: string) => {
    if (!config) {
      return
    }
    const updatedIds = config.ignoredChatIds.filter((i) => i !== id)
    await window.electron.setWhatsappSqliteConfig({
      ignoredChatIds: updatedIds,
    })
    setConfig({ ...config, ignoredChatIds: updatedIds })
  }

  if (!config) {
    return <LoadingSkeleton />
  }

  return (
    <SyncTab
      title="WhatsApp (SQLite)"
      description="Sync WhatsApp messages directly from the WhatsApp Desktop app database. Requires WhatsApp Desktop to be installed."
      footer={
        <DataSourceLogs
          logs={logs}
          highlightSyncId={highlightSyncId}
          sourceLabel="WhatsApp (SQLite)"
        />
      }
    >
      <FullDiskPermission description="WhatsApp SQLite sync requires Full Disk Access to read the WhatsApp database." />

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

      <div>
        <label className="block text-sm font-medium mb-1.5">
          Ignored Group IDs
        </label>
        <p className="text-xs text-[var(--text-color-secondary)] mb-2">
          Messages from these group chats will not be synced. Enter the group
          JID (e.g., 123456789@g.us).
        </p>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newIgnoredId}
            onChange={(e) => setNewIgnoredId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddIgnoredId()
              }
            }}
            placeholder="Group ID (e.g., 123456789@g.us)"
            className="flex-1 px-3 py-2 rounded-md border bg-[var(--background-color-three)] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            onClick={handleAddIgnoredId}
            disabled={!newIgnoredId.trim()}
            className="px-3 py-2 rounded-md bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
        {config.ignoredChatIds.length > 0 && (
          <div className="space-y-1">
            {config.ignoredChatIds.map((id) => (
              <div
                key={id}
                className="flex items-center justify-between px-3 py-2 rounded-md bg-[var(--background-color-two)] text-sm"
              >
                <span className="font-mono text-xs truncate">{id}</span>
                <button
                  onClick={() => handleRemoveIgnoredId(id)}
                  className="ml-2 text-red-500 hover:text-red-600 text-xs font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <HistoricalBackfill />
    </SyncTab>
  )
})
