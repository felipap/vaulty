import { useState, useEffect } from 'react'
import { ServiceConfig } from '../../../electron'
import { withBoundary } from '../../../shared/ui/withBoundary'
import { DataSourceLogs } from '../../DataSourceLogs'
import { SyncTab, ToggleRow, IntervalSelect, LoadingSkeleton, useSyncLogs, SyncNowButton } from '../shared'

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

export const MacosStickiesSyncTab = withBoundary(function MacosStickiesSyncTab({
  onEnabledChange,
  highlightSyncId,
}: Props) {
  const [config, setConfig] = useState<ServiceConfig | null>(null)
  const logs = useSyncLogs('macos-stickies')

  useEffect(() => {
    window.electron.getServiceConfig('macosStickiesSync').then(setConfig)
  }, [])

  const handleToggleEnabled = async () => {
    if (!config) {
      return
    }
    const newEnabled = !config.enabled
    await window.electron.setServiceConfig('macosStickiesSync', { enabled: newEnabled })
    setConfig({ ...config, enabled: newEnabled })
    onEnabledChange(newEnabled)
  }

  const handleIntervalChange = async (minutes: number) => {
    if (!config) {
      return
    }
    await window.electron.setServiceConfig('macosStickiesSync', { intervalMinutes: minutes })
    setConfig({ ...config, intervalMinutes: minutes })
  }

  if (!config) {
    return <LoadingSkeleton />
  }

  return (
    <SyncTab
      title="macOS Stickies Sync"
      description="Sync your macOS Stickies notes to the server."
      footer={
        <DataSourceLogs
          logs={logs}
          highlightSyncId={highlightSyncId}
          sourceLabel="macOS Stickies Sync"
        />
      }
    >
      <ToggleRow
        label="Enable macOS Stickies Sync"
        enabled={config.enabled}
        onChange={handleToggleEnabled}
      />

      <IntervalSelect
        value={config.intervalMinutes}
        options={INTERVAL_OPTIONS}
        onChange={handleIntervalChange}
        disabled={!config.enabled}
      />

      <SyncNowButton serviceName="macos-stickies" disabled={!config.enabled} />
    </SyncTab>
  )
})
