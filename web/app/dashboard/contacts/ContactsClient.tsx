"use client"

import { useEffect, useState } from "react"
import { getContacts, type Contact } from "./actions"
import { Pagination } from "@/ui/Pagination"

export function ContactsClient() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    setLoading(true)
    getContacts(page)
      .then((data) => {
        setContacts(data.contacts)
        setTotalPages(data.totalPages)
        setTotal(data.total)
      })
      .finally(() => setLoading(false))
  }, [page])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Contacts</h1>
        <span className="text-sm text-zinc-500">
          {total.toLocaleString()} total
        </span>
      </div>

      {loading ? (
        <p className="text-zinc-500">Loading...</p>
      ) : contacts.length === 0 ? (
        <p className="text-zinc-500">No contacts yet.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {contacts.map((contact) => (
              <ContactCard key={contact.contact} contact={contact} />
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}

function ContactCard({ contact }: { contact: Contact }) {
  const displayName = formatContact(contact.contact)
  const initial = getInitial(displayName)
  const bgColor = getAvatarColor(contact.contact)

  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium ${bgColor}`}
      >
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{displayName}</p>
        <p className="text-xs text-zinc-500">
          {contact.messageCount.toLocaleString()} message
          {contact.messageCount !== 1 ? "s" : ""}
        </p>
        {contact.lastMessageDate && (
          <p className="text-xs text-zinc-400">
            {formatRelativeDate(new Date(contact.lastMessageDate))}
          </p>
        )}
      </div>
    </div>
  )
}

function formatContact(contact: string): string {
  if (contact.includes("@")) {
    return contact
  }
  if (contact.startsWith("+")) {
    const digits = contact.slice(1)
    if (digits.length === 11 && digits.startsWith("1")) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    }
    return contact
  }
  return contact
}

function getInitial(name: string): string {
  if (name.includes("@")) {
    return name.charAt(0).toUpperCase()
  }
  if (name.startsWith("+")) {
    return "#"
  }
  return name.charAt(0).toUpperCase()
}

const avatarColors = [
  "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
  "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
  "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
  "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
  "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
]

function getAvatarColor(contact: string): string {
  let hash = 0
  for (let i = 0; i < contact.length; i++) {
    hash = contact.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return "Today"
  }
  if (diffDays === 1) {
    return "Yesterday"
  }
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "long" })
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" })
}
