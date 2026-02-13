import { useState, useEffect } from 'react'
import { ServiceConfig } from '../../../electron'
import { ScreenRecordingPermission } from '../ScreenRecordingPermission'
import { withBoundary } from '../../../shared/ui/withBoundary'
import { DataSourceLogs } from '../../DataSourceLogs'
import { SyncTab, ToggleRow, IntervalSelect, LoadingSkeleton, useSyncLogs } from '../shared'

type Props = {
  onEnabledChange: (enabled: boolean) => void
  highlightSyncId: string | null
}

const INTERVAL_OPTIONS = [
  { value: 1, label: 'Every 1 minute' },
  { value: 2, label: 'Every 2 minutes' },
  { value: 5, label: 'Every 5 minutes' },
  { value: 10, label: 'Every 10 minutes' },
  { value: 15, label: 'Every 15 minutes' },
  { value: 30, label: 'Every 30 minutes' },
]

export const ScreenshotsSyncTab = withBoundary(function ScreenshotsSyncTab({
  onEnabledChange,
  highlightSyncId,
}: Props) {
  const [config, setConfig] = useState<ServiceConfig | null>(null)
  const logs = useSyncLogs('screenshots')

  useEffect(() => {
    window.electron.getServiceConfig('screenCapture').then(setConfig)
  }, [])

  const handleToggleEnabled = async () => {
    if (!config) {
      return
    }
    const newEnabled = !config.enabled
    await window.electron.setServiceConfig('screenCapture', { enabled: newEnabled })
    setConfig({ ...config, enabled: newEnabled })
    onEnabledChange(newEnabled)
  }

  const handleIntervalChange = async (minutes: number) => {
    if (!config) {
      return
    }
    await window.electron.setServiceConfig('screenCapture', { intervalMinutes: minutes })
    setConfig({ ...config, intervalMinutes: minutes })
  }

  if (!config) {
    return <LoadingSkeleton />
  }

  return (
    <SyncTab
      title="Screen Capture"
      description="Automatically capture screenshots at regular intervals."
      footer={
        <DataSourceLogs
          logs={logs}
          highlightSyncId={highlightSyncId}
          sourceLabel="Screen Capture"
        />
      }
    >
      <ScreenRecordingPermission />

      <ToggleRow
        label="Enable Screen Capture"
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
