"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { getContacts, type Contact } from "./actions"
import { DemoBlur } from "@/ui/DemoBlur"
import { Pagination } from "@/ui/Pagination"
import { SearchIcon } from "@/ui/icons"

export default function Page() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query)
      setPage(1)
    }, 300)
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const data = await getContacts(page, 20, debouncedQuery || undefined)
      setContacts(data.contacts)
      setTotalPages(data.totalPages)
      setTotal(data.total)
      setLoading(false)
    }
    load()
  }, [page, debouncedQuery])

  let inner
  if (loading) {
    inner = <p className="text-zinc-500">Loading...</p>
  } else if (contacts.length === 0) {
    inner = (
      <p className="text-zinc-500">
        {debouncedQuery ? "No contacts matching your search." : "No contacts yet."}
      </p>
    )
  } else {
    inner = (
      <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
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
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Contacts</h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <SearchIcon
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="text"
              placeholder="Search contacts..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-600"
            />
          </div>
          <span className="shrink-0 text-sm text-zinc-500">
            {total.toLocaleString()} {debouncedQuery ? "matching" : "total"}
          </span>
        </div>
      </div>

      {inner}
    </div>
  )
}

function ContactCard({ contact }: { contact: Contact }) {
  const displayName = getDisplayName(contact)
  const initial = getInitial(displayName)
  const bgColor = getAvatarColor(contact.id)

  return (
    <Link
      href={`/dashboard/contacts/${contact.id}`}
      className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium ${bgColor}`}
      >
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium"><DemoBlur>{displayName}</DemoBlur></p>
        {contact.organization && (
          <p className="truncate text-xs text-zinc-500">
            {contact.organization}
          </p>
        )}
        {contact.phoneNumbers.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {contact.phoneNumbers.slice(0, 2).map((phone, i) => (
              <span
                key={i}
                className="inline-block rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              >
                <DemoBlur>{formatPhone(phone)}</DemoBlur>
              </span>
            ))}
            {contact.phoneNumbers.length > 2 && (
              <span className="text-xs text-zinc-400">
                +{contact.phoneNumbers.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}

function getDisplayName(contact: Contact): string {
  if (contact.firstName || contact.lastName) {
    return [contact.firstName, contact.lastName].filter(Boolean).join(" ")
  }
  if (contact.organization) {
    return contact.organization
  }
  if (contact.emails && contact.emails.length > 0) {
    return contact.emails[0]
  }
  if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
    return contact.phoneNumbers[0]
  }
  return "Unknown"
}

function getInitial(name: string): string {
  if (name.includes("@")) {
    return name.charAt(0).toUpperCase()
  }
  if (name.startsWith("+") || /^\d/.test(name)) {
    return "#"
  }
  return name.charAt(0).toUpperCase()
}

function formatPhone(phone: string): string {
  if (phone.startsWith("+1") && phone.length === 12) {
    return `(${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`
  }
  return phone
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

function getAvatarColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarColors[Math.abs(hash) % avatarColors.length]
}
