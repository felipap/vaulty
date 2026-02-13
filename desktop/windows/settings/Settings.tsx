import { useEffect, useState, useMemo } from 'react'
import { GeneralSettings } from './GeneralSettings'
import { LogsTab } from './log-viewer/LogsTab'
import { Onboarding } from './Onboarding/index'
import { Sidebar, ActiveTab, DataSourceInfo } from './Sidebar'
import { ScreenshotsSyncTab } from './sync-tabs/screenshots'
import { IMessageSyncTab } from './sync-tabs/imessage'
import { ContactsSyncTab } from './sync-tabs/contacts'
import { WhatsappSqliteSyncTab } from './sync-tabs/whatsapp-sqlite'
import { MacosStickiesSyncTab } from './sync-tabs/macos-stickies'
import { WinStickyNotesSyncTab } from './sync-tabs/win-sticky-notes'
import { SyncLogSource, SOURCE_LABELS } from '../electron'

const isMac = window.electron.platform === 'darwin'
const isWindows = window.electron.platform === 'win32'

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
      <div className="h-screen flex items-center justify-center bg-one">
        <p className="text-tertiary text-sm">Loading...</p>
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
      const [
        screenshots,
        imessage,
        contacts,
        whatsappSqlite,
        macosStickies,
        winStickyNotes,
        syncLogs,
      ] = await Promise.all([
        window.electron.getServiceConfig('screenCapture'),
        window.electron.getServiceConfig('imessageExport'),
        window.electron.getServiceConfig('icontactsSync'),
        window.electron.getServiceConfig('whatsappSqlite'),
        window.electron.getServiceConfig('macosStickiesSync'),
        window.electron.getServiceConfig('winStickyNotesSync'),
        window.electron.getSyncLogs(),
      ])

      // Find last sync status for each source
      const lastSyncStatus: Partial<Record<SyncLogSource, boolean>> = {}

      // Find first (most recent) log for each source
      const seenSources = new Set<SyncLogSource>()
      for (const log of syncLogs) {
        if (!seenSources.has(log.source)) {
          lastSyncStatus[log.source] = log.status === 'error'
          seenSources.add(log.source)
        }
      }

      const infos: DataSourceInfo[] = [
        {
          source: 'screenshots',
          label: SOURCE_LABELS['screenshots'],
          enabled: screenshots.enabled,
          lastSyncFailed: lastSyncStatus['screenshots'] ?? false,
        },
        {
          source: 'whatsapp-sqlite',
          label: SOURCE_LABELS['whatsapp-sqlite'],
          enabled: whatsappSqlite.enabled,
          lastSyncFailed: lastSyncStatus['whatsapp-sqlite'] ?? false,
        },
      ]

      if (isMac) {
        infos.push(
          {
            source: 'imessage',
            label: SOURCE_LABELS['imessage'],
            enabled: imessage.enabled,
            lastSyncFailed: lastSyncStatus['imessage'] ?? false,
          },
          {
            source: 'contacts',
            label: SOURCE_LABELS['contacts'],
            enabled: contacts.enabled,
            lastSyncFailed: lastSyncStatus['contacts'] ?? false,
          },
          {
            source: 'macos-stickies',
            label: SOURCE_LABELS['macos-stickies'],
            enabled: macosStickies.enabled,
            lastSyncFailed: lastSyncStatus['macos-stickies'] ?? false,
          },
        )
      }

      if (isWindows) {
        infos.push({
          source: 'win-sticky-notes',
          label: SOURCE_LABELS['win-sticky-notes'],
          enabled: winStickyNotes.enabled,
          lastSyncFailed: lastSyncStatus['win-sticky-notes'] ?? false,
        })
      }

      setDataSourceInfos(infos)
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
    <div className="h-screen flex bg-one">
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
        {activeTab === 'macos-stickies' && (
          <MacosStickiesSyncTab
            onEnabledChange={(enabled) =>
              handleSourceEnabledChange('macos-stickies', enabled)
            }
            highlightSyncId={highlightSyncId}
          />
        )}
        {activeTab === 'win-sticky-notes' && (
          <WinStickyNotesSyncTab
            onEnabledChange={(enabled) =>
              handleSourceEnabledChange('win-sticky-notes', enabled)
            }
            highlightSyncId={highlightSyncId}
          />
        )}
      </div>
    </div>
  )
}
