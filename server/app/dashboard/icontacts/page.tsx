"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  getContacts,
  deleteAllContacts,
  type Contact,
  type ContactSearchParams,
} from "./actions"
import { DemoBlur } from "@/ui/DemoBlur"
import { Pagination } from "@/ui/Pagination"
import { DeleteAllButton } from "@/ui/DeleteAllButton"
import { SearchIcon } from "@/ui/icons"
import {
  PageHeader,
  PageCount,
  EmptyState,
  LoadingState,
} from "@/ui/PageHeader"
import { computeSearchIndex, getEncryptionKey } from "@/lib/encryption"
import {
  normalizeStringForSearch,
  normalizePhoneForSearch,
} from "@/lib/search-normalize"
import { ContactAvatar } from "@/ui/ContactAvatar"
import { Decrypted } from "@/ui/Decrypted"

async function buildSearchParams(query: string): Promise<ContactSearchParams> {
  const trimmed = query.trim()
  if (!trimmed) {
    return {}
  }

  const key = getEncryptionKey()
  if (!key) {
    return {}
  }

  const params: ContactSearchParams = {}

  // Compute name index (matches against both first and last name)
  const normalizedName = normalizeStringForSearch(trimmed)
  if (normalizedName) {
    const nameIndex = await computeSearchIndex(normalizedName, key)
    params.firstNameIndex = nameIndex
    params.lastNameIndex = nameIndex
  }

  // If query looks like a phone number, also compute phone index
  const normalizedPhone = normalizePhoneForSearch(trimmed)
  if (normalizedPhone) {
    params.phoneNumberIndex = await computeSearchIndex(normalizedPhone, key)
  }

  return params
}

export default function Page() {
  const router = useRouter()
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
      const searchParams = await buildSearchParams(debouncedQuery)
      const data = await getContacts(page, 20, searchParams)
      setContacts(data.contacts)
      setTotalPages(data.totalPages)
      setTotal(data.total)
      setLoading(false)
    }
    load()
  }, [page, debouncedQuery])

  async function handleDeleteAll() {
    await deleteAllContacts()
    router.refresh()
    setContacts([])
    setTotal(0)
    setTotalPages(1)
    setPage(1)
  }

  let inner
  if (loading) {
    inner = <LoadingState />
  } else if (contacts.length === 0) {
    inner = (
      <EmptyState
        message={
          debouncedQuery
            ? "No contacts matching your search."
            : "No contacts yet."
        }
      />
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
      <PageHeader title="Contacts">
        {(total > 0 || debouncedQuery) && (
          <>
            <div className="relative">
              <SearchIcon
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary"
              />
              <input
                type="text"
                placeholder="Search contacts..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="rounded-lg border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-sm placeholder:text-secondary focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-600"
              />
            </div>
            <PageCount total={total} filtered={!!debouncedQuery} />
            <DeleteAllButton
              confirmMessage="Delete all contacts? This will permanently remove all contacts from the database."
              onDelete={handleDeleteAll}
            />
          </>
        )}
      </PageHeader>

      {inner}
    </div>
  )
}

function ContactCard({ contact }: { contact: Contact }) {
  return (
    <Link
      href={`/dashboard/icontacts/${contact.id}`}
      className="overflow-hidden flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
    >
      <ContactAvatar id={contact.id} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          <DemoBlur>
            <Decrypted>{contact.firstName}</Decrypted>
            {contact.lastName && (
              <>
                {" "}
                <Decrypted>{contact.lastName}</Decrypted>
              </>
            )}
          </DemoBlur>
        </p>
        {contact.phoneNumbers.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {contact.phoneNumbers.slice(0, 2).map((phone, i) => (
              <span
                key={i}
                className="inline-block rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-secondary dark:bg-zinc-800"
              >
                <Decrypted>{phone}</Decrypted>
              </span>
            ))}
            {contact.phoneNumbers.length > 2 && (
              <span className="text-xs text-secondary">
                +{contact.phoneNumbers.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
