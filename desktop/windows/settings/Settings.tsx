import { useEffect, useState, useMemo } from 'react'
import { GeneralSettings } from './GeneralSettings'
import { DataSourceSettings } from './DataSourceSettings'
import { LogsTab } from './log-viewer/LogsTab'
import { SyncLog, SyncLogSource, ServiceConfig } from '../electron'

type SidebarItem =
  | { type: 'general' }
  | { type: 'logs' }
  | { type: 'source'; source: SyncLogSource }

type DataSourceInfo = {
  source: SyncLogSource
  label: string
  enabled: boolean
  lastSyncFailed: boolean
}

const SOURCE_LABELS: Record<SyncLogSource, string> = {
  screenshots: 'Screen Capture',
  imessage: 'iMessage Export',
  contacts: 'Contacts Sync',
  'unipile-whatsapp': 'WhatsApp (Unipile)',
}

function getInitialItem(): SidebarItem {
  const params = new URLSearchParams(window.location.search)
  const tab = params.get('tab')
  if (tab === 'logs') {
    return { type: 'logs' }
  }
  return { type: 'general' }
}

function getHighlightSyncId(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get('highlightSyncId')
}

function SidebarButton({
  active,
  onClick,
  children,
  disabled,
  hasError,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
  hasError?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-2 text-sm text-left rounded-md transition-colors flex items-center justify-between ${
        active
          ? 'bg-blue-500 text-white'
          : disabled
            ? 'text-[var(--text-color-secondary)] opacity-60 hover:bg-[var(--background-color-three)]'
            : 'text-[var(--color-contrast)] hover:bg-[var(--background-color-three)]'
      }`}
    >
      <span>{children}</span>
      {hasError && !active && (
        <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
      )}
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-color-secondary)]">
      {children}
    </div>
  )
}

export function Settings() {
  const [activeItem, setActiveItem] = useState<SidebarItem>(getInitialItem)
  const [highlightSyncId, setHighlightSyncId] = useState<string | null>(
    getHighlightSyncId,
  )
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [dataSourceInfos, setDataSourceInfos] = useState<DataSourceInfo[]>([])

  // Load data source configs and logs
  useEffect(() => {
    async function loadDataSources() {
      const [screenshots, imessage, contacts, unipile, syncLogs] =
        await Promise.all([
          window.electron.getScreenCaptureConfig(),
          window.electron.getIMessageExportConfig(),
          window.electron.getContactsSyncConfig(),
          window.electron.getUnipileWhatsappConfig(),
          window.electron.getSyncLogs(),
        ])

      setLogs(syncLogs)

      // Find last sync status for each source
      const lastSyncStatus: Record<SyncLogSource, boolean> = {
        screenshots: false,
        imessage: false,
        contacts: false,
        'unipile-whatsapp': false,
      }

      for (const log of syncLogs) {
        if (lastSyncStatus[log.source] === undefined) {
          lastSyncStatus[log.source] = log.status === 'error'
        }
      }

      // Find first (most recent) log for each source
      const seenSources = new Set<SyncLogSource>()
      for (const log of syncLogs) {
        if (!seenSources.has(log.source)) {
          lastSyncStatus[log.source] = log.status === 'error'
          seenSources.add(log.source)
        }
      }

      setDataSourceInfos([
        {
          source: 'screenshots',
          label: SOURCE_LABELS['screenshots'],
          enabled: screenshots.enabled,
          lastSyncFailed: lastSyncStatus['screenshots'],
        },
        {
          source: 'imessage',
          label: SOURCE_LABELS['imessage'],
          enabled: imessage.enabled,
          lastSyncFailed: lastSyncStatus['imessage'],
        },
        {
          source: 'contacts',
          label: SOURCE_LABELS['contacts'],
          enabled: contacts.enabled,
          lastSyncFailed: lastSyncStatus['contacts'],
        },
        {
          source: 'unipile-whatsapp',
          label: SOURCE_LABELS['unipile-whatsapp'],
          enabled: unipile.enabled,
          lastSyncFailed: lastSyncStatus['unipile-whatsapp'],
        },
      ])
    }

    loadDataSources()

    const interval = setInterval(loadDataSources, 2000)
    return () => clearInterval(interval)
  }, [])

  // Handle URL changes
  useEffect(() => {
    function handleLocationChange() {
      setActiveItem(getInitialItem())
      setHighlightSyncId(getHighlightSyncId())
    }

    window.addEventListener('popstate', handleLocationChange)
    return () => window.removeEventListener('popstate', handleLocationChange)
  }, [])

  // Clear highlight after delay
  useEffect(() => {
    if (highlightSyncId) {
      const timeout = setTimeout(() => {
        setHighlightSyncId(null)
        const url = new URL(window.location.href)
        url.searchParams.delete('highlightSyncId')
        window.history.replaceState({}, '', url.toString())
      }, 3000)
      return () => clearTimeout(timeout)
    }
  }, [highlightSyncId])

  // Sort data sources: enabled first (alphabetically), then disabled (alphabetically)
  const sortedDataSources = useMemo(() => {
    return [...dataSourceInfos].sort((a, b) => {
      if (a.enabled !== b.enabled) {
        return a.enabled ? -1 : 1
      }
      return a.label.localeCompare(b.label)
    })
  }, [dataSourceInfos])

  const enabledSources = sortedDataSources.filter((s) => s.enabled)
  const disabledSources = sortedDataSources.filter((s) => !s.enabled)

  const handleSelectItem = (item: SidebarItem) => {
    setActiveItem(item)
  }

  const handleSourceEnabledChange = (
    source: SyncLogSource,
    enabled: boolean,
  ) => {
    setDataSourceInfos((prev) =>
      prev.map((info) =>
        info.source === source ? { ...info, enabled } : info,
      ),
    )
  }

  const filteredLogs =
    activeItem.type === 'source'
      ? logs.filter((log) => log.source === activeItem.source)
      : logs

  return (
    <div className="h-screen flex bg-[var(--background-color-one)]">
      {/* Sidebar */}
      <div className="w-52 flex-shrink-0 border-r bg-[var(--background-color-two)] flex flex-col">
        <div className="p-2 space-y-1">
          <SidebarButton
            active={activeItem.type === 'general'}
            onClick={() => handleSelectItem({ type: 'general' })}
          >
            General
          </SidebarButton>
          <SidebarButton
            active={activeItem.type === 'logs'}
            onClick={() => handleSelectItem({ type: 'logs' })}
          >
            All Logs
          </SidebarButton>
        </div>

        <div className="border-t my-2" />

        <div className="flex-1 overflow-auto px-2 pb-2">
          {enabledSources.length > 0 && (
            <div className="mb-2">
              <SectionLabel>Enabled</SectionLabel>
              <div className="space-y-1">
                {enabledSources.map((info) => (
                  <SidebarButton
                    key={info.source}
                    active={
                      activeItem.type === 'source' &&
                      activeItem.source === info.source
                    }
                    onClick={() =>
                      handleSelectItem({ type: 'source', source: info.source })
                    }
                    hasError={info.lastSyncFailed}
                  >
                    {info.label}
                  </SidebarButton>
                ))}
              </div>
            </div>
          )}

          {disabledSources.length > 0 && (
            <div>
              <SectionLabel>Disabled</SectionLabel>
              <div className="space-y-1">
                {disabledSources.map((info) => (
                  <SidebarButton
                    key={info.source}
                    active={
                      activeItem.type === 'source' &&
                      activeItem.source === info.source
                    }
                    onClick={() =>
                      handleSelectItem({ type: 'source', source: info.source })
                    }
                    disabled
                  >
                    {info.label}
                  </SidebarButton>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-4">
        {activeItem.type === 'general' && <GeneralSettings />}
        {activeItem.type === 'logs' && (
          <LogsTab highlightSyncId={highlightSyncId} />
        )}
        {activeItem.type === 'source' && (
          <DataSourceSettings
            source={activeItem.source}
            logs={filteredLogs}
            highlightSyncId={highlightSyncId}
            onEnabledChange={(enabled) =>
              handleSourceEnabledChange(activeItem.source, enabled)
            }
          />
        )}
      </div>
    </div>
  )
}
