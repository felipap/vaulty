import { useState, useEffect } from 'react'
import { SERVICES, ServiceSection } from './services/ServiceSection'

export function MainTab() {
  const [serverUrl, setServerUrl] = useState('')
  const [deviceSecret, setDeviceSecret] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [url, secret] = await Promise.all([
        window.electron.getServerUrl(),
        window.electron.getDeviceSecret(),
      ])
      setServerUrl(url ?? '')
      setDeviceSecret(secret ?? '')
      setIsLoading(false)
    }
    load()
  }, [])

  const handleServerUrlBlur = async () => {
    await window.electron.setServerUrl(serverUrl)
  }

  const handleDeviceSecretBlur = async () => {
    await window.electron.setDeviceSecret(deviceSecret)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-[var(--text-color-secondary)]">
        Loading settings...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Server Connection</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Server URL
            </label>
            <input
              type="url"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              onBlur={handleServerUrlBlur}
              className="w-full px-3 py-2 rounded-md border bg-[var(--background-color-three)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="http://context.yourdomain.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Device Secret
            </label>
            <input
              type="password"
              value={deviceSecret}
              onChange={(e) => setDeviceSecret(e.target.value)}
              onBlur={handleDeviceSecretBlur}
              className="w-full px-3 py-2 rounded-md border bg-[var(--background-color-three)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter the secret from your server"
            />
            <p className="text-xs text-[var(--text-color-secondary)] mt-1">
              Must match API_WRITE_SECRET on the server
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Data Sources</h2>
        <div className="space-y-2">
          {SERVICES.map((service) => (
            <ServiceSection key={service.name} service={service} />
          ))}
        </div>
      </div>
    </div>
  )
}
