import { WhatsappUnipileConfig } from '../../../../../shared-types'
import { ServiceSection, ServiceInfo } from '../ServiceSection'
import { UnipileConfig } from './UnipileConfig'

const SERVICE: ServiceInfo = {
  name: 'whatsapp-unipile',
  label: 'WhatsApp (Unipile)',
  description: 'Sync WhatsApp messages via Unipile API',
  getConfig: () => window.electron.getWhatsappUnipileConfig(),
  setConfig: (config) => window.electron.setWhatsappUnipileConfig(config),
  intervalOptions: [
    { value: 1, label: 'Every 1 minute' },
    { value: 5, label: 'Every 5 minutes' },
    { value: 15, label: 'Every 15 minutes' },
    { value: 30, label: 'Every 30 minutes' },
    { value: 60, label: 'Every hour' },
  ],
}

export function WhatsappUnipileService() {
  return (
    <ServiceSection service={SERVICE}>
      {({ config, setConfig }) => (
        <UnipileConfig
          config={config as WhatsappUnipileConfig}
          onConfigChange={async (newConfig) => {
            await SERVICE.setConfig(newConfig)
            const updated = await SERVICE.getConfig()
            setConfig(updated)
          }}
        />
      )}
    </ServiceSection>
  )
}
