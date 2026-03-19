"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getReminders, deleteAllReminders, type ReminderItem } from "./actions"
import { Pagination } from "@/ui/indices/Pagination"
import { maybeDecrypt } from "@/lib/encryption"
import {
  PageHeader,
  PageCount,
  EmptyState,
  LoadingState,
} from "@/ui/indices/PageHeader"
import { twMerge } from "tailwind-merge"

type Filter = "all" | "incomplete" | "completed"

export default function Page() {
  const router = useRouter()
  const [reminders, setReminders] = useState<ReminderItem[]>([])
  const [decrypted, setDecrypted] = useState<
    Record<string, { title: string | null; notes: string | null; listName: string | null }>
  >({})
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState<Filter>("all")

  useEffect(() => {
    async function load() {
      setLoading(true)
      const data = await getReminders(page, 30, filter)
      setReminders(data.reminders)
      setTotalPages(data.totalPages)
      setTotal(data.total)

      const dec: Record<string, { title: string | null; notes: string | null; listName: string | null }> = {}
      for (const r of data.reminders) {
        dec[r.id] = {
          title: await maybeDecrypt(r.title),
          notes: r.notes ? await maybeDecrypt(r.notes) : null,
          listName: r.listName ? await maybeDecrypt(r.listName) : null,
        }
      }
      setDecrypted(dec)

      setLoading(false)
    }
    load()
  }, [page, filter])

  async function handleDeleteAll() {
    await deleteAllReminders()
    router.refresh()
  }

  function handleFilterChange(newFilter: Filter) {
    setFilter(newFilter)
    setPage(1)
  }

  let inner
  if (loading) {
    inner = <LoadingState />
  } else if (reminders.length === 0) {
    inner = <EmptyState message="No reminders yet." />
  } else {
    inner = (
      <>
        <div className="flex flex-col gap-1">
          {reminders.map((reminder) => (
            <ReminderRow
              key={reminder.id}
              reminder={reminder}
              decryptedTitle={decrypted[reminder.id]?.title ?? null}
              decryptedNotes={decrypted[reminder.id]?.notes ?? null}
              decryptedListName={decrypted[reminder.id]?.listName ?? null}
            />
          ))}
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </>
    )
  }

  return (
    <div>
      <PageHeader
        title="Apple Reminders"
        onDeleteAll={handleDeleteAll}
        deleteConfirmMessage="Delete all reminders? This will permanently delete all Apple Reminders from the database."
      >
        {total > 0 && <PageCount total={total} />}
      </PageHeader>
      <FilterTabs filter={filter} onFilterChange={handleFilterChange} />
      {inner}
    </div>
  )
}

function FilterTabs({
  filter,
  onFilterChange,
}: {
  filter: Filter
  onFilterChange: (f: Filter) => void
}) {
  const tabs: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "incomplete", label: "Incomplete" },
    { value: "completed", label: "Completed" },
  ]

  return (
    <div className="mb-4 flex gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onFilterChange(tab.value)}
          className={twMerge(
            "rounded-sm px-2.5 py-1 text-[13px] transition-colors",
            filter === tab.value
              ? "bg-neutral-100 text-contrast dark:bg-neutral-800"
              : "text-secondary hover:bg-neutral-50 hover:text-contrast dark:hover:bg-neutral-900"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function ReminderRow({
  reminder,
  decryptedTitle,
  decryptedNotes,
  decryptedListName,
}: {
  reminder: ReminderItem
  decryptedTitle: string | null
  decryptedNotes: string | null
  decryptedListName: string | null
}) {
  const title = decryptedTitle ?? reminder.title
  const notes = decryptedNotes ?? reminder.notes
  const listName = decryptedListName ?? reminder.listName

  return (
    <div className="flex items-start gap-3 border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div
        className={twMerge(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
          reminder.completed
            ? "border-blue-500 bg-blue-500"
            : "border-zinc-300 dark:border-zinc-600"
        )}
      >
        {reminder.completed && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={twMerge(
            "text-sm leading-snug",
            reminder.completed && "text-secondary line-through"
          )}
        >
          {title}
        </p>
        {notes && (
          <p className="mt-0.5 text-xs text-secondary line-clamp-2">
            {notes}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-2 text-xs text-tertiary">
          {listName && <span>{listName}</span>}
          {reminder.flagged && <span className="text-orange-500">Flagged</span>}
          {reminder.dueDate && (
            <span>Due {formatDate(reminder.dueDate)}</span>
          )}
          {reminder.priority > 0 && reminder.priority < 5 && (
            <span>Priority {priorityLabel(reminder.priority)}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function priorityLabel(priority: number): string {
  if (priority === 1) {
    return "High"
  }
  if (priority <= 4) {
    return "Medium"
  }
  return "Low"
}
