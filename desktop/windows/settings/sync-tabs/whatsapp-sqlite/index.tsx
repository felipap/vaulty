import { useState, useEffect } from 'react'
import { WhatsappSqliteConfig } from '../../../../shared-types'
import { FullDiskPermission } from '../FullDiskPermission'
import { HistoricalBackfill } from './HistoricalBackfill'
import { IgnoredChatIds } from './IgnoredChatIds'
import { withBoundary } from '../../../shared/ui/withBoundary'
import { DataSourceLogs } from '../../DataSourceLogs'
import {
  SyncTab,
  ToggleRow,
  IntervalSelect,
  LoadingSkeleton,
  useSyncLogs,
  SyncNowButton,
} from '../shared'

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

export const WhatsappSqliteSyncTab = withBoundary(
  function WhatsappSqliteSyncTab({ onEnabledChange, highlightSyncId }: Props) {
    const [config, setConfig] = useState<WhatsappSqliteConfig | null>(null)
    const logs = useSyncLogs('whatsapp-sqlite')

    useEffect(() => {
      window.electron.getServiceConfig('whatsappSqlite').then(setConfig)
    }, [])

    const handleToggleEnabled = async () => {
      if (!config) {
        return
      }
      const newEnabled = !config.enabled
      await window.electron.setServiceConfig('whatsappSqlite', { enabled: newEnabled })
      setConfig({ ...config, enabled: newEnabled })
      onEnabledChange(newEnabled)
    }

    const handleIntervalChange = async (minutes: number) => {
      if (!config) {
        return
      }
      await window.electron.setServiceConfig('whatsappSqlite', {
        intervalMinutes: minutes,
      })
      setConfig({ ...config, intervalMinutes: minutes })
    }

    const handleAddIgnoredId = async (id: string) => {
      if (!config || config.ignoredChatIds?.includes(id)) {
        return
      }
      const updatedIds = [...(config.ignoredChatIds ?? []), id]
      await window.electron.setServiceConfig('whatsappSqlite', {
        ignoredChatIds: updatedIds,
      })
      setConfig({ ...config, ignoredChatIds: updatedIds })
    }

    const handleRemoveIgnoredId = async (id: string) => {
      if (!config) {
        return
      }
      const updatedIds = (config.ignoredChatIds ?? []).filter((i) => i !== id)
      await window.electron.setServiceConfig('whatsappSqlite', {
        ignoredChatIds: updatedIds,
      })
      setConfig({ ...config, ignoredChatIds: updatedIds })
    }

    if (!config) {
      return <LoadingSkeleton />
    }

    return (
      <SyncTab
        title="WhatsApp"
        description="Sync WhatsApp messages directly from the WhatsApp Desktop app database. Requires WhatsApp Desktop to be installed."
        footer={
          <DataSourceLogs
            logs={logs}
            highlightSyncId={highlightSyncId}
            sourceLabel="WhatsApp"
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

        <SyncNowButton serviceName="whatsapp-sqlite" disabled={!config.enabled} />

        <IgnoredChatIds
          ignoredChatIds={config.ignoredChatIds ?? []}
          onAdd={handleAddIgnoredId}
          onRemove={handleRemoveIgnoredId}
        />

        <HistoricalBackfill />
      </SyncTab>
    )
  },
)
