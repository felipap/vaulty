import { useState, useEffect } from 'react'
import { EyeIcon, EyeOffIcon, DiceIcon } from '../shared/ui/icons'
import { Label } from '../shared/ui/forms'
import { twMerge } from 'tailwind-merge'

function generatePassword(length = 40): string {
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => charset[byte % charset.length]).join('')
}

type PasswordInputProps = {
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  placeholder: string
  hasError?: boolean
  onGenerate?: () => void
}

function PasswordInput({
  value,
  onChange,
  onBlur,
  placeholder,
  hasError,
  onGenerate,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="flex gap-2 items-center">
      <div className="relative flex-1">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={twMerge(
            'w-full px-3 py-2 pr-10 rounded-md border bg-input focus:outline-none focus:ring-2 focus:ring-blue-500',
            hasError ? 'border-red-500' : '',
          )}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-secondary hover:text-contrast transition-colors"
        >
          {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
        </button>
      </div>
      {onGenerate && (
        <button
          type="button"
          onClick={onGenerate}
          className="flex items-center gap-1 px-2.5 py-2 rounded-md border text-sm text-secondary hover:text-contrast hover:bg-(--surface-hover) transition-colors shrink-0"
          title="Generate a random value"
        >
          <DiceIcon size={15} />
          <span>Generate</span>
        </button>
      )}
    </div>
  )
}

export function GeneralSettings() {
  const [serverUrl, setServerUrl] = useState('')
  const [deviceSecret, setDeviceSecret] = useState('')
  const [encryptionKey, setEncryptionKey] = useState('')
  const [openAtLogin, setOpenAtLogin] = useState(false)
  const [appVersion, setAppVersion] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const hasEncryptionKey = encryptionKey.length > 0

  useEffect(() => {
    async function load() {
      const [url, secret, key, loginEnabled, version] = await Promise.all([
        window.electron.getServerUrl(),
        window.electron.getDeviceSecret(),
        window.electron.getEncryptionKey(),
        window.electron.getOpenAtLogin(),
        window.electron.getAppVersion(),
      ])
      setServerUrl(url ?? '')
      setDeviceSecret(secret ?? '')
      setEncryptionKey(key ?? '')
      setOpenAtLogin(loginEnabled)
      setAppVersion(version)
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

  const handleEncryptionKeyBlur = async () => {
    await window.electron.setEncryptionKey(encryptionKey)
  }

  const handleOpenAtLoginChange = async (enabled: boolean) => {
    setOpenAtLogin(enabled)
    await window.electron.setOpenAtLogin(enabled)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-secondary">
        Loading settings...
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-lg font-semibold mb-4">App Settings</h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={openAtLogin}
            onChange={(e) => handleOpenAtLoginChange(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm">Start on login</span>
        </label>
        <p className="text-xs text-secondary mt-1 ml-7">
          Automatically start Vaulty when you log in to your computer
        </p>
        <p className="text-xs text-secondary mt-4">Version {appVersion}</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Server Connection</h2>

        {!hasEncryptionKey && (
          <div className="mb-4 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Set an encryption key below to enable data syncing.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label>Server URL</Label>
            <input
              type="url"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              onBlur={handleServerUrlBlur}
              className="w-full px-3 py-2 rounded-md border bg-input focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="http://context.yourdomain.com"
            />
          </div>

          <div>
            <Label>API Write Secret</Label>
            <PasswordInput
              value={deviceSecret}
              onChange={setDeviceSecret}
              onBlur={handleDeviceSecretBlur}
              placeholder="Enter the secret from your server"
              onGenerate={() => {
                const password = generatePassword()
                setDeviceSecret(password)
                window.electron.setDeviceSecret(password)
              }}
            />
            <p className="text-xs text-secondary mt-1">
              Must match API_WRITE_SECRET on the server
            </p>
          </div>

          <div className="space-y-2">
            <Label>
              Encryption Key (E2E) <span className="text-red-500">*</span>
            </Label>
            <PasswordInput
              value={encryptionKey}
              onChange={setEncryptionKey}
              onBlur={handleEncryptionKeyBlur}
              placeholder="Required: passphrase for E2E encryption"
              hasError={!hasEncryptionKey}
              onGenerate={() => {
                const password = generatePassword()
                setEncryptionKey(password)
                window.electron.setEncryptionKey(password)
              }}
            />
            <p className="text-xs text-secondary mt-1">
              All data is encrypted before upload. Use the same key on the
              dashboard to decrypt.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
