import { useState, useEffect } from 'react'
import { CheckCircleIcon, WarningIcon } from '../../shared/ui/icons'

type Props = {
  description: string
  onPermissionChange?: (hasAccess: boolean) => void
}

export function FullDiskPermission({ description, onPermissionChange }: Props) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  const checkAccess = async () => {
    setIsChecking(true)
    const result = await window.electron.checkFullDiskAccess()
    setHasAccess(result.hasAccess)
    setIsChecking(false)
    onPermissionChange?.(result.hasAccess)
  }

  useEffect(() => {
    checkAccess()
  }, [])

  const handleOpenSettings = () => {
    window.electron.openFullDiskAccessSettings()
  }

  if (isChecking) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--text-color-secondary)]">
        <span className="animate-pulse">Checking permissions...</span>
      </div>
    )
  }

  if (hasAccess) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <CheckCircleIcon className="text-green-600 dark:text-green-400" />
        <span className="text-green-600 dark:text-green-400">
          Full Disk Access granted
        </span>
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <WarningIcon className="text-amber-600 dark:text-amber-400 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Full Disk Access Required
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            {description}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleOpenSettings}
          className="text-xs px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors"
        >
          Open System Settings
        </button>
        <button
          onClick={checkAccess}
          className="text-xs px-3 py-1.5 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/30 rounded-md transition-colors"
        >
          Check Again
        </button>
      </div>
    </div>
  )
}
