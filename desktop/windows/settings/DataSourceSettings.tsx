import { SyncLog, SyncLogSource } from '../electron'
import { ScreenshotsConfig } from './main/services/screenshots/ScreenshotsConfig'
import { IMessageConfig } from './main/services/imessage/IMessageConfig'
import { ContactsConfig } from './main/services/contacts/ContactsConfig'
import { SqliteConfig } from './main/services/whatsapp-sqlite/SqliteConfig'
import { UnipileConfigPanel } from './main/services/whatsapp-unipile/UnipileConfigPanel'
import { DataSourceLogs } from './DataSourceLogs'

type Props = {
  source: SyncLogSource
  logs: SyncLog[]
  highlightSyncId?: string | null
  onEnabledChange: (enabled: boolean) => void
}

const SOURCE_LABELS: Record<SyncLogSource, string> = {
  screenshots: 'Screen Capture',
  imessage: 'iMessage Export',
  contacts: 'Contacts Sync',
  'whatsapp-sqlite': 'WhatsApp (SQLite)',
  'whatsapp-unipile': 'WhatsApp (Unipile)',
}

export function DataSourceSettings({
  source,
  logs,
  highlightSyncId,
  onEnabledChange,
}: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">{SOURCE_LABELS[source]}</h2>

      <div className="max-w-lg">
        {source === 'screenshots' && (
          <ScreenshotsConfig onEnabledChange={onEnabledChange} />
        )}
        {source === 'imessage' && (
          <IMessageConfig onEnabledChange={onEnabledChange} />
        )}
        {source === 'contacts' && (
          <ContactsConfig onEnabledChange={onEnabledChange} />
        )}
        {source === 'whatsapp-sqlite' && (
          <SqliteConfig onEnabledChange={onEnabledChange} />
        )}
        {source === 'whatsapp-unipile' && (
          <UnipileConfigPanel onEnabledChange={onEnabledChange} />
        )}
      </div>

      <div className="border-t pt-6">
        <DataSourceLogs
          logs={logs}
          highlightSyncId={highlightSyncId}
          sourceLabel={SOURCE_LABELS[source]}
        />
      </div>
    </div>
  )
}
