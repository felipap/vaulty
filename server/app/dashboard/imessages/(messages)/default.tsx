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
import { PageCount, EmptyState, LoadingState } from "@/ui/PageHeader"

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
          let decryptedText: string | null = msg.text
          if (msg.text && isEncrypted(msg.text) && encryptionKey) {
            decryptedText = await decryptText(msg.text, encryptionKey)
          } else if (msg.text && isEncrypted(msg.text)) {
            decryptedText = null
          }

          let decryptedContact = msg.contact
          if (isEncrypted(msg.contact) && encryptionKey) {
            decryptedContact =
              (await decryptText(msg.contact, encryptionKey)) ?? msg.contact
          }

          return { ...msg, decryptedText, decryptedContact }
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
    return <LoadingState />
  }

  if (messages.length === 0) {
    return <EmptyState message="No iMessages yet." />
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <PageCount total={total} />
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
