"use client"

import { useEffect, useState, useCallback } from "react"
import { SortSelector } from "@/ui/SortSelector"
import { getMessages, type Message, type SortBy } from "./actions"
import { getContactLookup, type ContactLookup } from "../chats/actions"

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "syncTime", label: "Time received" },
  { value: "date", label: "Message date" },
]
import { decryptText, isEncrypted, getEncryptionKey } from "@/lib/encryption"
import { MessagesTable, type DecryptedMessage } from "./MessagesTable"

export default function Page() {
  const [messages, setMessages] = useState<DecryptedMessage[]>([])
  const [contactLookup, setContactLookup] = useState<ContactLookup>({})
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [sortBy, setSortBy] = useState<SortBy>("date")

  const decryptMessages = useCallback(
    async (msgs: Message[]): Promise<DecryptedMessage[]> => {
      const encryptionKey = getEncryptionKey()
      return Promise.all(
        msgs.map(async (msg) => {
          if (!msg.text || !isEncrypted(msg.text)) {
            return { ...msg, decryptedText: msg.text }
          }
          if (!encryptionKey) {
            return { ...msg, decryptedText: null }
          }
          const decrypted = await decryptText(msg.text, encryptionKey)
          return { ...msg, decryptedText: decrypted }
        })
      )
    },
    []
  )

  // Fetch contacts once on mount
  useEffect(() => {
    getContactLookup().then(setContactLookup)
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const data = await getMessages(page, 20, sortBy)
      const decrypted = await decryptMessages(data.messages)
      setMessages(decrypted)
      setTotalPages(data.totalPages)
      setTotal(data.total)
      setLoading(false)
    }
    load()
  }, [page, sortBy, decryptMessages])

  function handleSortChange(newSortBy: SortBy) {
    setSortBy(newSortBy)
    setPage(1)
  }

  if (loading) {
    return <p className="text-zinc-500">Loading...</p>
  }

  if (messages.length === 0) {
    return <p className="text-zinc-500">No messages yet.</p>
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-zinc-500">
          {total.toLocaleString()} total messages
        </span>
        <SortSelector
          value={sortBy}
          onChange={handleSortChange}
          options={SORT_OPTIONS}
        />
      </div>
      <MessagesTable
        messages={messages}
        contactLookup={contactLookup}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        sortBy={sortBy}
      />
    </>
  )
}
