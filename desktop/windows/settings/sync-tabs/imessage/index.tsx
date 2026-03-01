import { useState, useEffect } from 'react'
import { IMessageExportConfig, WriteJobsConfig } from '../../../electron'
import { FullDiskPermission } from '../FullDiskPermission'
import { HistoricalBackfill } from './HistoricalBackfill'
import { AllowedRecipients } from './AllowedRecipients'
import { withBoundary } from '../../../shared/ui/withBoundary'
import { InfoCircleIcon } from '../../../shared/ui/icons'
import { DataSourceLogs } from '../../DataSourceLogs'
import { SyncTab, ToggleRow, IntervalSelect, LoadingSkeleton, useSyncLogs, SyncNowButton } from '../shared'

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

function AttachmentNotice({ enabled }: { enabled: boolean }) {
  if (!enabled) {
    return null
  }
  return (
    <div className="flex gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
      <InfoCircleIcon className="text-blue-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-blue-700 dark:text-blue-300">
        Only images (JPEG, PNG, GIF, HEIC) are uploaded. Videos and other
        attachments are skipped to save bandwidth.
      </p>
    </div>
  )
}

export const IMessageSyncTab = withBoundary(function IMessageSyncTab({
  onEnabledChange,
  highlightSyncId,
}: Props) {
  const [config, setConfig] = useState<IMessageExportConfig | null>(null)
  const [writeJobsConfig, setWriteJobsConfig] = useState<WriteJobsConfig | null>(null)
  const logs = useSyncLogs('imessage')

  useEffect(() => {
    window.electron.getServiceConfig('imessageExport').then(setConfig)
    window.electron.getServiceConfig('writeJobs').then((wj) => {
      setWriteJobsConfig({ ...wj, allowedRecipients: wj.allowedRecipients ?? [] })
    })
  }, [])

  const handleToggleEnabled = async () => {
    if (!config) {
      return
    }
    const newEnabled = !config.enabled
    await window.electron.setServiceConfig('imessageExport', { enabled: newEnabled })
    setConfig({ ...config, enabled: newEnabled })
    onEnabledChange(newEnabled)
  }

  const handleToggleAttachments = async () => {
    if (!config) {
      return
    }
    const newValue = !config.includeAttachments
    await window.electron.setServiceConfig('imessageExport', {
      includeAttachments: newValue,
    })
    setConfig({ ...config, includeAttachments: newValue })
  }

  const handleIntervalChange = async (minutes: number) => {
    if (!config) {
      return
    }
    await window.electron.setServiceConfig('imessageExport', { intervalMinutes: minutes })
    setConfig({ ...config, intervalMinutes: minutes })
  }

  const handleToggleMessageSending = async () => {
    if (!writeJobsConfig) {
      return
    }
    const newEnabled = !writeJobsConfig.enabled
    await window.electron.setServiceConfig('writeJobs', { enabled: newEnabled })
    setWriteJobsConfig({ ...writeJobsConfig, enabled: newEnabled })
  }

  const handleAddRecipient = async (recipient: string) => {
    if (!writeJobsConfig || writeJobsConfig.allowedRecipients.includes(recipient)) {
      return
    }
    const updated = [...writeJobsConfig.allowedRecipients, recipient]
    await window.electron.setServiceConfig('writeJobs', { allowedRecipients: updated })
    setWriteJobsConfig({ ...writeJobsConfig, allowedRecipients: updated })
  }

  const handleRemoveRecipient = async (recipient: string) => {
    if (!writeJobsConfig) {
      return
    }
    const updated = writeJobsConfig.allowedRecipients.filter((r) => r !== recipient)
    await window.electron.setServiceConfig('writeJobs', { allowedRecipients: updated })
    setWriteJobsConfig({ ...writeJobsConfig, allowedRecipients: updated })
  }

  if (!config || !writeJobsConfig) {
    return <LoadingSkeleton />
  }

  return (
    <SyncTab
      title="macOS Messages"
      description="Export iMessage conversations to the server."
      footer={
        <DataSourceLogs
          logs={logs}
          highlightSyncId={highlightSyncId}
          sourceLabel="macOS Messages"
        />
      }
    >
      <FullDiskPermission description="iMessage export requires Full Disk Access to read your messages database." />

      <ToggleRow
        label="Enable macOS Messages Sync"
        enabled={config.enabled}
        onChange={handleToggleEnabled}
      />

      <ToggleRow
        label="Sync image attachments"
        enabled={config.includeAttachments}
        onChange={handleToggleAttachments}
      />

      <AttachmentNotice enabled={config.includeAttachments} />

      <IntervalSelect
        value={config.intervalMinutes}
        options={INTERVAL_OPTIONS}
        onChange={handleIntervalChange}
        disabled={!config.enabled}
      />

      <SyncNowButton serviceName="imessage" disabled={!config.enabled} />

      <HistoricalBackfill />

      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold mb-3">Message Sending</h3>
        <div className="space-y-4">
          <ToggleRow
            label="Enable message sending"
            enabled={writeJobsConfig.enabled}
            onChange={handleToggleMessageSending}
          />

          <AllowedRecipients
            recipients={writeJobsConfig.allowedRecipients}
            onAdd={handleAddRecipient}
            onRemove={handleRemoveRecipient}
          />
        </div>
      </div>
    </SyncTab>
  )
})
