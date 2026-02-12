"use client"

import {
  clearEncryptionKey,
  getEncryptionKey,
  getEncryptionKeyExpiry,
  setEncryptionKey,
} from "@/lib/encryption"
import { Button } from "@/ui/Button"
import { LockIcon, UnlockIcon } from "@/ui/icons"
import { type Route } from "next"
import { usePathname, useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { twMerge } from "tailwind-merge"

export function EncryptionKeyButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [keyInput, setKeyInput] = useState("")
  const [hasKey, setHasKey] = useState(false)
  const [expiryTime, setExpiryTime] = useState<Date | null>(null)
  const [, setTick] = useState(0)
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Handle encryption key from URL (from desktop app tray)
  useEffect(() => {
    const keyFromUrl = searchParams.get("key")
    if (keyFromUrl) {
      setEncryptionKey(keyFromUrl)
      setHasKey(true)
      setExpiryTime(getEncryptionKeyExpiry())
      // Remove key from URL for security
      const newParams = new URLSearchParams(searchParams.toString())
      newParams.delete("key")
      const newUrl = newParams.toString()
        ? `${pathname}?${newParams.toString()}`
        : pathname
      router.replace(newUrl as Route)
    }
  }, [searchParams, router, pathname])

  useEffect(() => {
    const key = getEncryptionKey()
    setHasKey(!!key)
    setExpiryTime(getEncryptionKeyExpiry())
  }, [])

  // Update every minute to keep the countdown fresh
  useEffect(() => {
    if (!hasKey || !expiryTime) {
      return
    }
    const interval = setInterval(() => {
      setTick((t) => t + 1)
      // Check if expired
      if (expiryTime.getTime() <= Date.now()) {
        clearEncryptionKey()
        setHasKey(false)
        setExpiryTime(null)
        window.location.reload()
      }
    }, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [hasKey, expiryTime])

  const handleSetKey = () => {
    if (keyInput.trim()) {
      setEncryptionKey(keyInput.trim())
      setHasKey(true)
      setExpiryTime(getEncryptionKeyExpiry())
      setKeyInput("")
      setIsOpen(false)
      window.location.reload()
    }
  }

  const handleClearKey = () => {
    clearEncryptionKey()
    setHasKey(false)
    setExpiryTime(null)
    setIsOpen(false)
    window.location.reload()
  }

  const getMinutesRemaining = (date: Date | null) => {
    if (!date) {
      return null
    }
    // eslint-disable-next-line react-hooks/purity -- Date.now() is intentionally impure to get current time for countdown
    const diff = date.getTime() - Date.now()
    if (diff <= 0) {
      return 0
    }
    return Math.floor(diff / 60000)
  }

  const formatExpiry = (date: Date | null) => {
    if (!date) {
      return ""
    }
    const mins = getMinutesRemaining(date)
    if (mins === null || mins <= 0) {
      return "Expired"
    }
    if (mins < 60) {
      return `Clearing in ${mins}m`
    }
    return `Clearing in ${Math.floor(mins / 60)}h ${mins % 60}m`
  }

  const minutesRemaining = getMinutesRemaining(expiryTime)
  const showCountdown =
    hasKey && minutesRemaining !== null && minutesRemaining <= 10

  const getButtonLabel = () => {
    if (!hasKey) {
      return "Encrypted"
    }
    if (showCountdown) {
      return `${minutesRemaining}m left`
    }
    return "Decrypted"
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        // size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={twMerge(
          "gap-1.5 font-mono text-xs",
          hasKey
            ? showCountdown
              ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400 dark:hover:bg-amber-950"
              : "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 dark:hover:bg-emerald-950"
            : ""
        )}
        title={
          hasKey
            ? `Encryption active - ${formatExpiry(expiryTime)}`
            : "Set encryption key"
        }
        icon={hasKey ? <UnlockIcon /> : <LockIcon />}
      >
        <span className="hidden sm:inline">{getButtonLabel()}</span>
      </Button>

      {isOpen && (
        <EncryptionKeyPopover
          hasKey={hasKey}
          expiryLabel={formatExpiry(expiryTime)}
          keyInput={keyInput}
          onKeyInputChange={setKeyInput}
          onSetKey={handleSetKey}
          onClearKey={handleClearKey}
        />
      )}
    </div>
  )
}

type PopoverProps = {
  hasKey: boolean
  expiryLabel: string
  keyInput: string
  onKeyInputChange: (value: string) => void
  onSetKey: () => void
  onClearKey: () => void
}

function EncryptionKeyPopover({
  hasKey,
  expiryLabel,
  keyInput,
  onKeyInputChange,
  onSetKey,
  onClearKey,
}: PopoverProps) {
  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-neutral-200 bg-white p-4 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
      {hasKey ? (
        <div className="space-y-3">
          <div className="text-sm">
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              Encryption key active
            </span>
            <p className="mt-1 font-mono text-xs text-neutral-500">
              {expiryLabel}
            </p>
          </div>
          <Button onClick={onClearKey} className="w-full">
            Clear Key
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">
              Encryption Key
            </label>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => onKeyInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSetKey()}
              placeholder="Enter your encryption key"
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 font-mono text-sm focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:focus:border-neutral-500"
              autoFocus
            />
          </div>
          <p className="text-xs text-neutral-400">
            Enter the same key used in the desktop app to decrypt messages. Key
            expires after 1 hour.
          </p>
          <Button
            onClick={onSetKey}
            disabled={!keyInput.trim()}
            className="w-full"
          >
            Set Key
          </Button>
        </div>
      )}
    </div>
  )
}
