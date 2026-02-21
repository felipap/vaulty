import { useState, useEffect } from 'react'
import { ServiceConfig } from '../../../electron'
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
  { value: 30, label: 'Every 30 minutes' },
  { value: 60, label: 'Every hour' },
  { value: 360, label: 'Every 6 hours' },
  { value: 720, label: 'Every 12 hours' },
  { value: 1440, label: 'Every 24 hours' },
]

export const WinStickyNotesSyncTab = withBoundary(
  function WinStickyNotesSyncTab({ onEnabledChange, highlightSyncId }: Props) {
    const [config, setConfig] = useState<ServiceConfig | null>(null)
    const logs = useSyncLogs('win-sticky-notes')

    useEffect(() => {
      window.electron.getServiceConfig('winStickyNotesSync').then(setConfig)
    }, [])

    const handleToggleEnabled = async () => {
      if (!config) {
        return
      }
      const newEnabled = !config.enabled
      await window.electron.setServiceConfig('winStickyNotesSync', { enabled: newEnabled })
      setConfig({ ...config, enabled: newEnabled })
      onEnabledChange(newEnabled)
    }

    const handleIntervalChange = async (minutes: number) => {
      if (!config) {
        return
      }
      await window.electron.setServiceConfig('winStickyNotesSync', {
        intervalMinutes: minutes,
      })
      setConfig({ ...config, intervalMinutes: minutes })
    }

    if (!config) {
      return <LoadingSkeleton />
    }

    return (
      <SyncTab
        title="Windows Sticky Notes Sync"
        description="Sync your Windows Sticky Notes to the server."
        footer={
          <DataSourceLogs
            logs={logs}
            highlightSyncId={highlightSyncId}
            sourceLabel="Windows Sticky Notes Sync"
          />
        }
      >
        <ToggleRow
          label="Enable Windows Sticky Notes Sync"
          enabled={config.enabled}
          onChange={handleToggleEnabled}
        />

        <IntervalSelect
          value={config.intervalMinutes}
          options={INTERVAL_OPTIONS}
          onChange={handleIntervalChange}
          disabled={!config.enabled}
        />

        <SyncNowButton serviceName="win-sticky-notes" disabled={!config.enabled} />
      </SyncTab>
    )
  },
)
