"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowDownIcon, ArrowUpIcon, LockIcon, WhatsappIcon } from "@/ui/icons"
import { Pagination } from "@/ui/Pagination"
import { isEncrypted } from "@/lib/encryption"
import { type WhatsappMessage, type SortBy } from "./actions"

export type DecryptedMessage = WhatsappMessage & {
  decryptedText: string | null
  decryptedChatName: string | null
  decryptedSenderName: string | null
}

type Props = {
  messages: DecryptedMessage[]
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  sortBy: SortBy
}

const columnHelper = createColumnHelper<DecryptedMessage>()

export function MessagesTable({
  messages,
  page,
  totalPages,
  onPageChange,
  sortBy,
}: Props) {
  const router = useRouter()

  const columns = useMemo(
    () => [
      columnHelper.accessor("isFromMe", {
        header: "Direction",
        size: 100,
        cell: (info) => <DirectionBadge isFromMe={info.getValue()} />,
      }),
      columnHelper.accessor("chatId", {
        header: "Chat",
        size: 180,
        cell: (info) => {
          const { decryptedChatName, chatId } = info.row.original
          const displayName = decryptedChatName || chatId

          return (
            <div className="flex items-center gap-2">
              <WhatsappIcon />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm">{displayName}</span>
                <span className="truncate text-xs text-zinc-500">{chatId}</span>
              </div>
            </div>
          )
        },
      }),
      columnHelper.accessor("sender", {
        header: "Sender",
        size: 140,
        cell: (info) => {
          const sender = info.getValue()
          const { decryptedSenderName, isFromMe } = info.row.original

          if (isFromMe) {
            return <span className="text-sm text-zinc-500">You</span>
          }

          const displayName = decryptedSenderName || sender

          return (
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm">{displayName}</span>
              <span className="truncate text-xs text-zinc-500">{sender}</span>
            </div>
          )
        },
      }),
      columnHelper.accessor("text", {
        id: "text",
        header: "Message",
        size: 320,
        cell: (info) => <MessageCell message={info.row.original} />,
      }),
      columnHelper.accessor(sortBy === "syncTime" ? "syncTime" : "timestamp", {
        id: "dateColumn",
        header: sortBy === "syncTime" ? "Received" : "Message Date",
        size: 200,
        cell: (info) => (
          <DateCell message={info.row.original} sortBy={sortBy} />
        ),
      }),
    ],
    [sortBy]
  )

  const table = useReactTable({
    data: messages,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  })

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full table-fixed">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-sm font-medium text-zinc-500"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => router.push(`/dashboard/whatsapp/${row.id}`)}
                className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="overflow-hidden px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400"
                    style={{
                      maxWidth: cell.column.getSize(),
                      width: cell.column.getSize(),
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </>
  )
}

function DateCell({
  message,
  sortBy,
}: {
  message: DecryptedMessage
  sortBy: SortBy
}) {
  const primaryDate =
    sortBy === "syncTime" ? message.syncTime : message.timestamp
  const secondaryDate =
    sortBy === "syncTime" ? message.timestamp : message.syncTime
  const secondaryLabel = sortBy === "syncTime" ? "sent" : "received"

  return (
    <div className="flex flex-col">
      <span className="text-zinc-700 dark:text-zinc-300">
        {primaryDate ? new Date(primaryDate).toLocaleString() : "—"}
      </span>
      {secondaryDate && (
        <span className="text-xs text-zinc-400">
          {secondaryLabel}: {new Date(secondaryDate).toLocaleString()}
        </span>
      )}
    </div>
  )
}

function MessageCell({ message }: { message: DecryptedMessage }) {
  const isMessageEncrypted = isEncrypted(message.text)
  const displayText = message.decryptedText

  if (displayText) {
    return (
      <div className="flex min-w-0 items-center gap-1.5">
        {isMessageEncrypted && (
          <span className="shrink-0 text-green-500" title="Decrypted">
            <LockIcon size={12} />
          </span>
        )}
        <span className="min-w-0 truncate">{displayText}</span>
      </div>
    )
  }

  if (isMessageEncrypted) {
    return (
      <span className="flex items-center gap-1.5 italic text-amber-500">
        <LockIcon size={12} />
        Encrypted - enter key to decrypt
      </span>
    )
  }

  return <span className="italic text-zinc-400">No content</span>
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
