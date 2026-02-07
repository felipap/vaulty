import { useState, useEffect } from 'react'
import { Button } from '../../shared/ui/Button'
import { Label } from '../../shared/ui/forms'
import { PasswordInput } from '../../shared/ui/PasswordInput'

function generatePassword(length = 40): string {
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => charset[byte % charset.length]).join('')
}

type Props = {
  onNext: () => void
  onBack: () => void
}

export function ServerStep({ onNext, onBack }: Props) {
  const [serverUrl, setServerUrl] = useState('')
  const [deviceSecret, setDeviceSecret] = useState('')
  const [encryptionKey, setEncryptionKey] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [url, secret, key] = await Promise.all([
        window.electron.getServerUrl(),
        window.electron.getDeviceSecret(),
        window.electron.getEncryptionKey(),
      ])
      setServerUrl(url ?? '')
      setDeviceSecret(secret ?? '')
      setEncryptionKey(key ?? '')
    }
    load()
  }, [])

  const canContinue =
    serverUrl.trim().length > 0 &&
    deviceSecret.trim().length > 0 &&
    encryptionKey.trim().length > 0

  const handleContinue = async () => {
    setIsSaving(true)
    setError(null)
    try {
      await window.electron.setServerUrl(serverUrl.trim())
      await window.electron.setDeviceSecret(deviceSecret.trim())
      await window.electron.setEncryptionKey(encryptionKey.trim())
      onNext()
    } catch (err) {
      setError('Failed to save settings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full px-6 py-8">
      <div className="mb-6">
        <h2 className="text-lg font- track-10 mb-1">Connect to your vault</h2>
        <p className="text-secondary text-md font-text leading-normal">
          Enter your server details to start syncing data. Follow the{' '}
          <button
            type="button"
            onClick={() =>
              window.electron.openUrl(
                'https://github.com/felipap/vaulty/blob/main/web/README.md',
              )
            }
            className="inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-contrast transition-colors"
          >
            setup guide
          </button>{' '}
          or reach out to Felipe at{' '}
          <button
            type="button"
            onClick={() => window.electron.openUrl('mailto:faragaop@gmail.com')}
            className="underline underline-offset-2 hover:text-contrast transition-colors"
          >
            faragaop@gmail.com
          </button>
          .
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="space-y-5 flex-1">
        <div>
          <Label>Server URL</Label>
          <input
            type="url"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            className="text-md w-full px-3 py-2 rounded-md border bg-input focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://vault.yourdomain.com"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label>API Write Secret</Label>
          <PasswordInput
            value={deviceSecret}
            onChange={setDeviceSecret}
            placeholder="The secret from your server"
            onGenerate={() => setDeviceSecret(generatePassword())}
          />
          <p className="font-text text-xs text-secondary mt-1 track-10">
            Must match API_WRITE_SECRET on the server.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Encryption Key</Label>
          <PasswordInput
            value={encryptionKey}
            onChange={setEncryptionKey}
            placeholder="Passphrase for end-to-end encryption"
            hasError={false}
            onGenerate={() => setEncryptionKey(generatePassword())}
          />
          <p className="font-text text-xs text-secondary mt-1 track-10">
            All data is encrypted before upload. Use the same key on the
            dashboard to decrypt.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-6">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button
          variant="primary"
          onClick={handleContinue}
          disabled={!canContinue || isSaving}
        >
          {isSaving ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  )
}
