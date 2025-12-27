"use client"

import { useEffect, useState } from "react"
import { getMessages, type Message } from "./actions"
import { Pagination } from "@/ui/Pagination"

export function MessagesClient() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    setLoading(true)
    getMessages(page)
      .then((data) => {
        setMessages(data.messages)
        setTotalPages(data.totalPages)
        setTotal(data.total)
      })
      .finally(() => setLoading(false))
  }, [page])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Messages</h1>
        <span className="text-sm text-zinc-500">{total.toLocaleString()} total</span>
      </div>

      {loading ? (
        <p className="text-zinc-500">Loading...</p>
      ) : messages.length === 0 ? (
        <p className="text-zinc-500">No messages yet.</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                    Direction
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                    Message
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                {messages.map((message) => (
                  <MessageRow key={message.id} message={message} />
                ))}
              </tbody>
            </table>
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

function MessageRow({ message }: { message: Message }) {
  return (
    <tr className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900">
      <td className="px-4 py-3">
        <DirectionBadge isFromMe={message.isFromMe} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <ServiceIcon service={message.service} />
          <span className="text-sm">{formatContact(message.contact)}</span>
        </div>
      </td>
      <td className="max-w-[300px] truncate px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
        {message.text || (
          <span className="italic text-zinc-400">
            {message.hasAttachments ? "📎 Attachment" : "No content"}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-zinc-500">
        {message.date ? new Date(message.date).toLocaleString() : "—"}
      </td>
    </tr>
  )
}

function DirectionBadge({ isFromMe }: { isFromMe: boolean }) {
  if (isFromMe) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        <ArrowUpIcon />
        Sent
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
      <ArrowDownIcon />
      Received
    </span>
  )
}

function ArrowUpIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12 7-7 7 7" />
      <path d="M12 19V5" />
    </svg>
  )
}

function ArrowDownIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </svg>
  )
}

function ServiceIcon({ service }: { service: string }) {
  const isIMessage = service === "iMessage"

  return (
    <div
      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
        isIMessage ? "bg-blue-500 text-white" : "bg-green-500 text-white"
      }`}
      title={service}
    >
      {isIMessage ? "i" : "S"}
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


