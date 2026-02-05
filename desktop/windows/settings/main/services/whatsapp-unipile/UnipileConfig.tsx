import { useState, useEffect } from 'react'
import { WhatsappUnipileConfig } from '../../../../../shared-types'

type Props = {
  config: WhatsappUnipileConfig
  onConfigChange: (config: Partial<WhatsappUnipileConfig>) => Promise<void>
}

export function UnipileConfig({ config, onConfigChange }: Props) {
  const [apiBaseUrl, setApiBaseUrl] = useState(config.apiBaseUrl ?? '')
  const [apiToken, setApiToken] = useState(config.apiToken ?? '')
  const [accountId, setAccountId] = useState(config.accountId ?? '')

  useEffect(() => {
    setApiBaseUrl(config.apiBaseUrl ?? '')
    setApiToken(config.apiToken ?? '')
    setAccountId(config.accountId ?? '')
  }, [config])

  const handleApiBaseUrlBlur = async () => {
    await onConfigChange({ apiBaseUrl })
  }

  const handleApiTokenBlur = async () => {
    await onConfigChange({ apiToken })
  }

  const handleAccountIdBlur = async () => {
    await onConfigChange({ accountId })
  }

  const isConfigured = apiBaseUrl && apiToken && accountId

  return (
    <div className="space-y-3 pt-2">
      <div className="text-sm font-medium text-[var(--text-color-primary)]">
        Unipile API Configuration
      </div>

      {!isConfigured && (
        <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            Configure your Unipile API credentials to enable WhatsApp sync.
          </p>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium mb-1 text-[var(--text-color-secondary)]">
          API Base URL
        </label>
        <input
          type="url"
          value={apiBaseUrl}
          onChange={(e) => setApiBaseUrl(e.target.value)}
          onBlur={handleApiBaseUrlBlur}
          className="w-full px-2.5 py-1.5 text-sm rounded-md border bg-[var(--background-color-three)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://api16.unipile.com:14645"
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1 text-[var(--text-color-secondary)]">
          API Token
        </label>
        <input
          type="password"
          value={apiToken}
          onChange={(e) => setApiToken(e.target.value)}
          onBlur={handleApiTokenBlur}
          className="w-full px-2.5 py-1.5 text-sm rounded-md border bg-[var(--background-color-three)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Your Unipile API token"
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1 text-[var(--text-color-secondary)]">
          Account ID
        </label>
        <input
          type="text"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          onBlur={handleAccountIdBlur}
          className="w-full px-2.5 py-1.5 text-sm rounded-md border bg-[var(--background-color-three)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Your Unipile account ID"
        />
        <p className="text-xs text-[var(--text-color-secondary)] mt-1">
          The account ID for the connected WhatsApp account in Unipile.
        </p>
      </div>
    </div>
  )
}
