"use client"

import { useState, useSyncExternalStore } from "react"
import { CloseIcon } from "@/ui/icons"

const STORAGE_KEY = "ip-whitelist-warning-dismissed-at"
const ONE_DAY_MS = 24 * 60 * 60 * 1000

function getSnapshot(): boolean {
  const dismissedAt = localStorage.getItem(STORAGE_KEY)
  if (dismissedAt) {
    const elapsed = Date.now() - parseInt(dismissedAt, 10)
    if (elapsed < ONE_DAY_MS) {
      return true // Still within 24 hours, dismissed
    }
  }
  return false
}

function getServerSnapshot(): boolean {
  return true // Assume dismissed on server to avoid flash
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback)
  return () => window.removeEventListener("storage", callback)
}

export function IpWhitelistWarningBanner() {
  const isDismissedFromStorage = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )
  const [isDismissedLocally, setIsDismissedLocally] = useState(false)

  const isDismissed = isDismissedFromStorage || isDismissedLocally

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, Date.now().toString())
    setIsDismissedLocally(true)
  }

  if (isDismissed) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-red-600 px-4 py-3 text-white z-50">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <p className="text-sm">
          <span className="font-medium">Security Warning:</span> Dashboard IP
          whitelisting is not configured. Set{" "}
          <code className="rounded bg-red-700 px-1.5 py-0.5 font-mono text-sm">
            DASHBOARD_IP_WHITELIST
          </code>{" "}
          in your environment variables to restrict access.
        </p>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded p-1 hover:bg-red-700 transition-colors"
          aria-label="Dismiss warning"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  )
}
