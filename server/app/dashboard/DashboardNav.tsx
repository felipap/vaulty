"use client"

import {
  clearEncryptionKey,
  getEncryptionKey,
  getEncryptionKeyExpiry,
  setEncryptionKey,
} from "@/lib/encryption"
import { LockIcon, MoonIcon, SunIcon, UnlockIcon } from "@/ui/icons"
import { type Route } from "next"
import Link from "next/link"
import { usePathname, useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { twMerge } from "tailwind-merge"
import { logout } from "./actions"

const NAV_ITEMS: Array<{ href: string; label: string }> = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/screenshots", label: "Screenshots" },
  { href: "/dashboard/imessages", label: "iMessages" },
  { href: "/dashboard/whatsapp", label: "WhatsApp" },
  { href: "/dashboard/icontacts", label: "Contacts" },
  { href: "/dashboard/locations", label: "Locations" },
  { href: "/dashboard/stickies", label: "Stickies" },
  { href: "/dashboard/settings", label: "Settings" },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xl font-semibold">
              Vaulty
            </Link>
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              v{process.env.APP_VERSION}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <EncryptionKeyButton />
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
        <nav className="-mb-px flex gap-6">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href as Route}
                className={twMerge(
                  "border-b-2 pb-3 text-sm font-medium transition-colors",
                  isActive
                    ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-300"
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}

function EncryptionKeyButton() {
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
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={twMerge(
          "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors",
          hasKey
            ? showCountdown
              ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
              : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
            : "border-zinc-200 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        )}
        title={
          hasKey
            ? `Encryption active - ${formatExpiry(expiryTime)}`
            : "Set encryption key"
        }
      >
        {hasKey ? <UnlockIcon /> : <LockIcon />}
        <span className="hidden sm:inline">{getButtonLabel()}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
          {hasKey ? (
            <div className="space-y-3">
              <div className="text-sm">
                <span className="font-medium text-green-600 dark:text-green-400">
                  Encryption key active
                </span>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatExpiry(expiryTime)}
                </p>
              </div>
              <button
                onClick={handleClearKey}
                className="w-full rounded-md bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
              >
                Clear Now
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Encryption Key
                </label>
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSetKey()}
                  placeholder="Enter your encryption key"
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700"
                  autoFocus
                />
              </div>
              <p className="text-xs text-zinc-500">
                Enter the same key used in the desktop app to decrypt messages.
                Key expires after 1 hour.
              </p>
              <button
                onClick={handleSetKey}
                disabled={!keyInput.trim()}
                className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Set Key
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Standard hydration pattern
    setMounted(true)
    const isDarkMode = document.documentElement.classList.contains("dark")
    setIsDark(isDarkMode)
  }, [])

  const toggleTheme = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)

    if (newIsDark) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  if (!mounted) {
    return (
      <button
        className="rounded-lg border border-zinc-200 p-2 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        aria-label="Toggle theme"
      >
        <div className="h-[14px] w-[14px]" />
      </button>
    )
  }

  return (
    <button
      onClick={toggleTheme}
      className="rounded-lg border border-zinc-200 p-2 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <SunIcon size={14} /> : <MoonIcon size={14} />}
    </button>
  )
}
