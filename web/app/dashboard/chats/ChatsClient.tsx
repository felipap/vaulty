"use client"

import { Pagination } from "@/ui/Pagination"
import { useEffect, useState } from "react"
import { getChats, type Chat } from "./actions"

export function ChatsClient() {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const data = await getChats(page)
      setChats(data.chats)
      setTotalPages(data.totalPages)
      setTotal(data.total)
      setLoading(false)
    }
    load()
  }, [page])

  let inner
  if (loading) {
    inner = <p className="text-zinc-500">Loading...</p>
  } else if (chats.length === 0) {
    inner = <p className="text-zinc-500">No chats yet.</p>
  } else {
    inner = (
      <>
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                  Last Message
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                  Messages
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
              {chats.map((chat) => (
                <ChatRow key={chat.chatId} chat={chat} />
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
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Chats</h1>
        <span className="text-sm text-zinc-500">
          {total.toLocaleString()} total
        </span>
      </div>

      {inner}
    </div>
  )
}

function ChatRow({ chat }: { chat: Chat }) {
  const displayName = chat.isGroupChat
    ? `Group (${chat.participantCount})`
    : formatContact(chat.participants[0] || chat.chatId)

  return (
    <tr className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <ContactAvatar name={displayName} isGroup={chat.isGroupChat} />
          <span className="text-sm font-medium">{displayName}</span>
        </div>
      </td>
      <td className="max-w-[200px] truncate px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
        {chat.lastMessageFromMe && (
          <span className="text-zinc-400 dark:text-zinc-500">You: </span>
        )}
        {chat.lastMessageText || "No message"}
      </td>
      <td className="px-4 py-3 text-sm tabular-nums">
        {chat.messageCount.toLocaleString()}
      </td>
      <td className="px-4 py-3 text-sm text-zinc-500">
        {chat.lastMessageDate
          ? formatRelativeDate(new Date(chat.lastMessageDate))
          : "—"}
      </td>
    </tr>
  )
}

function ContactAvatar({ name, isGroup }: { name: string; isGroup: boolean }) {
  const initial = name.charAt(0).toUpperCase()
  const bgColor = isGroup
    ? "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
    : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"

  return (
    <div
      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${bgColor}`}
    >
      {isGroup ? <GroupIcon /> : initial}
    </div>
  )
}

function GroupIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
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

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  }
  if (diffDays === 1) {
    return "Yesterday"
  }
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" })
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" })
}
