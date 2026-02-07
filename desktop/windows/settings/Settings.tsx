import { useEffect, useState, useMemo } from 'react'
import { GeneralSettings } from './GeneralSettings'
import { LogsTab } from './log-viewer/LogsTab'
import { McpServerTab } from './mcp/McpServerTab'
import { Onboarding } from './Onboarding/index'
import { Sidebar, ActiveTab, DataSourceInfo } from './Sidebar'
import { ScreenshotsSyncTab } from './sync-tabs/screenshots'
import { IMessageSyncTab } from './sync-tabs/imessage'
import { ContactsSyncTab } from './sync-tabs/contacts'
import { WhatsappSqliteSyncTab } from './sync-tabs/whatsapp-sqlite'
import { SyncLogSource } from '../electron'

const SOURCE_LABELS: Record<SyncLogSource, string> = {
  screenshots: 'Screen Capture',
  imessage: 'iMessage Export',
  contacts: 'Contacts Sync',
  'whatsapp-sqlite': 'WhatsApp (SQLite)',
  'whatsapp-unipile': 'WhatsApp (Unipile)',
}

function getInitialTab(): ActiveTab {
  const params = new URLSearchParams(window.location.search)
  const tab = params.get('tab')
  if (tab === 'logs') {
    return 'logs'
  }
  return 'general'
}

function getHighlightSyncId(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get('highlightSyncId')
}

export function Settings() {
  const [onboardingCompleted, setOnboardingCompleted] = useState<
    boolean | null
  >(null)

  // Check onboarding state
  useEffect(() => {
    window.electron.getOnboardingCompleted().then(setOnboardingCompleted)
  }, [])

  // Show onboarding if not completed
  if (onboardingCompleted === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--background-color-one)]">
        <p className="text-secondary text-sm">Loading...</p>
      </div>
    )
  }

  if (!onboardingCompleted) {
    return <Onboarding onComplete={() => setOnboardingCompleted(true)} />
  }

  return <SettingsPanel />
}

function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<ActiveTab>(getInitialTab)
  const [highlightSyncId, setHighlightSyncId] = useState<string | null>(
    getHighlightSyncId,
  )
  const [dataSourceInfos, setDataSourceInfos] = useState<DataSourceInfo[]>([])

  // Load data source configs and logs
  useEffect(() => {
    async function loadDataSources() {
      const [screenshots, imessage, contacts, whatsappSqlite, syncLogs] =
        await Promise.all([
          window.electron.getScreenCaptureConfig(),
          window.electron.getIMessageExportConfig(),
          window.electron.getContactsSyncConfig(),
          window.electron.getWhatsappSqliteConfig(),
          window.electron.getSyncLogs(),
        ])

      // Find last sync status for each source
      const lastSyncStatus: Record<SyncLogSource, boolean> = {
        screenshots: false,
        imessage: false,
        contacts: false,
        'whatsapp-sqlite': false,
        'whatsapp-unipile': false,
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
          source: 'whatsapp-sqlite',
          label: SOURCE_LABELS['whatsapp-sqlite'],
          enabled: whatsappSqlite.enabled,
          lastSyncFailed: lastSyncStatus['whatsapp-sqlite'],
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
      setActiveTab(getInitialTab())
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

  return (
    <div className="h-screen flex bg-[var(--background-color-one)]">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        enabledSources={enabledSources}
        disabledSources={disabledSources}
      />

      {/* Main content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'general' && <GeneralSettings />}
        {activeTab === 'logs' && <LogsTab highlightSyncId={highlightSyncId} />}
        {activeTab === 'mcp' && <McpServerTab />}
        {activeTab === 'screenshots' && (
          <ScreenshotsSyncTab
            onEnabledChange={(enabled) =>
              handleSourceEnabledChange('screenshots', enabled)
            }
            highlightSyncId={highlightSyncId}
          />
        )}
        {activeTab === 'imessage' && (
          <IMessageSyncTab
            onEnabledChange={(enabled) =>
              handleSourceEnabledChange('imessage', enabled)
            }
            highlightSyncId={highlightSyncId}
          />
        )}
        {activeTab === 'contacts' && (
          <ContactsSyncTab
            onEnabledChange={(enabled) =>
              handleSourceEnabledChange('contacts', enabled)
            }
            highlightSyncId={highlightSyncId}
          />
        )}
        {activeTab === 'whatsapp-sqlite' && (
          <WhatsappSqliteSyncTab
            onEnabledChange={(enabled) =>
              handleSourceEnabledChange('whatsapp-sqlite', enabled)
            }
            highlightSyncId={highlightSyncId}
          />
        )}
      </div>
    </div>
  )
}
