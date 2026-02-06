"use client"

import { isEncrypted } from "@/lib/encryption"
import { ContactAvatar } from "@/ui/ContactAvatar"
import { DataTable } from "@/ui/DataTable"
import { Decrypted } from "@/ui/Decrypted"
import { LockIcon } from "@/ui/icons"
import { Pagination } from "@/ui/Pagination"
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { type WhatsappChat } from "./actions"

export type DecryptedChat = WhatsappChat & {
  decryptedChatName: string | null
  decryptedLastMessage: string | null
}

const columnHelper = createColumnHelper<DecryptedChat>()

const columns = [
  columnHelper.display({
    id: "chat",
    header: "Chat",
    size: 300,
    cell: ({ row }) => {
      const chat = row.original
      const isGroup = chat.participantCount > 2

      return (
        <div className="flex min-w-0 items-center gap-2">
          <ContactAvatar
            name={chat.decryptedChatName || "-"}
            isGroup={isGroup}
          />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">
              <Decrypted>{chat.chatName}</Decrypted>
            </span>
            <span className="truncate text-xs text-zinc-500">
              {chat.chatId}
            </span>
            {isGroup && (
              <span className="text-xs text-zinc-500">
                {chat.participantCount} participants
              </span>
            )}
          </div>
        </div>
      )
    },
  }),
  columnHelper.display({
    id: "lastMessage",
    header: "Last Message",
    size: 220,
    cell: ({ row }) => {
      const chat = row.original
      const isChatEncrypted = isEncrypted(chat.lastMessageText)
      const displayText = chat.decryptedLastMessage

      return (
        <div className="flex max-w-[200px] min-w-0 items-center gap-0.5 text-sm text-zinc-600 dark:text-zinc-400">
          {displayText ? (
            <>
              {chat.lastMessageFromMe && (
                <span className="shrink-0 text-zinc-400 dark:text-zinc-500">
                  You:{" "}
                </span>
              )}
              {isChatEncrypted && (
                <span
                  className="shrink-0 inline-flex items-center text-green-500"
                  title="Decrypted"
                >
                  <LockIcon size={10} />
                </span>
              )}
              <span className="min-w-0 truncate">{displayText}</span>
            </>
          ) : isChatEncrypted ? (
            <span className="flex items-center gap-1 italic text-amber-500">
              <LockIcon size={10} />
              Encrypted
            </span>
          ) : (
            "No message"
          )}
        </div>
      )
    },
  }),
  columnHelper.accessor("lastMessageDate", {
    header: "Date",
    size: 120,
    cell: (info) => {
      const date = info.getValue()
      return (
        <span className="text-zinc-500">
          {date ? formatRelativeDate(new Date(date)) : "—"}
        </span>
      )
    },
  }),
  columnHelper.accessor("messageCount", {
    header: "Count",
    size: 90,
    cell: (info) => (
      <span className="tabular-nums">{info.getValue().toLocaleString()}</span>
    ),
  }),
]

type Props = {
  chats: DecryptedChat[]
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function ChatsTable({ chats, page, totalPages, onPageChange }: Props) {
  const table = useReactTable({
    data: chats,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.chatId,
  })

  return (
    <>
      <DataTable
        table={table}
        getRowHref={(row) =>
          `/dashboard/whatsapp/chats/${encodeURIComponent(row.original.chatId)}`
        }
        tableClassName="table-fixed"
        getTdClassName={() => "overflow-hidden"}
        getTdStyle={(cell) => ({
          maxWidth: cell.column.getSize(),
          width: cell.column.getSize(),
        })}
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </>
  )
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
