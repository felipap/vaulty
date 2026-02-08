"use client"

import { TrashIcon } from "@/ui/icons"
import { useState } from "react"
import { deleteEverything } from "./actions"

export function DangerZone() {
  const [confirming, setConfirming] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [result, setResult] = useState<Record<string, number> | null>(null)

  async function handleDelete() {
    setDeleting(true)
    const counts = await deleteEverything()
    setResult(counts)
    setDeleting(false)
    setConfirming(false)
    setConfirmText("")
  }

  const confirmed = confirmText === "DELETE"

  return (
    <section>
      <div className="flex items-center gap-2">
        <TrashIcon size={18} />
        <h2 className="text-lg font-semibold">Danger Zone</h2>
      </div>

      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Permanently delete all your data. This includes screenshots, messages,
        contacts, locations, activity logs, and access tokens. This action
        cannot be undone.
      </p>

      {result && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">
            All data has been deleted.
          </p>
          <ul className="mt-2 space-y-1 text-sm text-red-700 dark:text-red-400">
            {result.screenshots > 0 && <li>{result.screenshots} screenshots</li>}
            {result.messages > 0 && <li>{result.messages} iMessages</li>}
            {result.attachments > 0 && <li>{result.attachments} attachments</li>}
            {result.whatsapp > 0 && <li>{result.whatsapp} WhatsApp messages</li>}
            {result.contacts > 0 && <li>{result.contacts} contacts</li>}
            {result.locations > 0 && <li>{result.locations} locations</li>}
            {result.writeLogs > 0 && <li>{result.writeLogs} write logs</li>}
            {result.readLogs > 0 && <li>{result.readLogs} read logs</li>}
            {result.tokens > 0 && <li>{result.tokens} access tokens</li>}
          </ul>
          <button
            onClick={() => setResult(null)}
            className="mt-2 text-xs text-red-600 hover:text-red-700 dark:text-red-400"
          >
            Dismiss
          </button>
        </div>
      )}

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="mt-4 flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <TrashIcon size={14} />
          Delete Everything
        </button>
      ) : (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">
            Type <span className="font-mono">DELETE</span> to confirm.
          </p>
          <div className="mt-3 flex flex-col gap-3">
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && confirmed) {
                  handleDelete()
                }
              }}
              placeholder="DELETE"
              className="w-full rounded-md border border-red-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-red-600 dark:bg-zinc-700"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={!confirmed || deleting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Everything"}
              </button>
              <button
                onClick={() => {
                  setConfirming(false)
                  setConfirmText("")
                }}
                className="rounded-md border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
