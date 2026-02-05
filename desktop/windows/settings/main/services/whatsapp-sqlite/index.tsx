import { ServiceSection, ServiceInfo } from '../ServiceSection'
import { FullDiskPermission } from '../FullDiskPermission'

const SERVICE: ServiceInfo = {
  name: 'whatsapp-sqlite',
  label: 'WhatsApp (SQLite)',
  description:
    'Sync WhatsApp messages from the local WhatsApp Desktop database',
  getConfig: () => window.electron.getWhatsappSqliteConfig(),
  setConfig: (config) => window.electron.setWhatsappSqliteConfig(config),
  intervalOptions: [
    { value: 1, label: 'Every 1 minute' },
    { value: 5, label: 'Every 5 minutes' },
    { value: 15, label: 'Every 15 minutes' },
    { value: 30, label: 'Every 30 minutes' },
    { value: 60, label: 'Every hour' },
  ],
}

export function WhatsappSqliteService() {
  return (
    <ServiceSection service={SERVICE}>
      <FullDiskPermission description="WhatsApp SQLite sync requires Full Disk Access to read the WhatsApp database." />
    </ServiceSection>
  )
}
