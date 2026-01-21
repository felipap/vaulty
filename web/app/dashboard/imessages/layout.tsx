"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { twMerge } from "tailwind-merge"
import { TrashIcon } from "@/ui/icons"
import { deleteAllIMessages } from "./(messages)/actions"

const subTabs = [
  { href: "/dashboard/imessages", label: "Messages" },
  { href: "/dashboard/imessages/chats", label: "Chats" },
]

interface Props {
  children: React.ReactNode
}

export default function MessagesLayout({ children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDeleteAll() {
    setDeleting(true)
    await deleteAllIMessages()
    setDeleting(false)
    setShowConfirm(false)
    router.refresh()
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">iMessages</h1>
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-2 rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
        >
          <TrashIcon size={16} />
          Delete All
        </button>
      </div>

      <div className="mb-6 flex gap-2">
        {subTabs.map((tab) => {
          const isActive = tab.href === "/dashboard/imessages"
            ? pathname === "/dashboard/imessages"
            : pathname.startsWith(tab.href)

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={twMerge(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {children}

      {showConfirm && (
        <ConfirmDialog
          onConfirm={handleDeleteAll}
          onCancel={() => setShowConfirm(false)}
          deleting={deleting}
        />
      )}
    </div>
  )
}

function ConfirmDialog({
  onConfirm,
  onCancel,
  deleting,
}: {
  onConfirm: () => void
  onCancel: () => void
  deleting: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2 className="mb-2 text-lg font-semibold">Delete All iMessages Data?</h2>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          This will permanently delete all iMessages and attachments from the database.
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete All"}
          </button>
        </div>
      </div>
    </div>
  )
}
