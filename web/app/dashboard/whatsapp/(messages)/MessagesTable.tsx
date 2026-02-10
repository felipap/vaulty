"use client"

import { useMemo } from "react"
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { WhatsappIcon } from "@/ui/icons"
import { DataTable } from "@/ui/DataTable"
import { Decrypted } from "@/ui/Decrypted"
import { DemoBlur } from "@/ui/DemoBlur"
import { DateCell as SharedDateCell } from "@/ui/DateCell"
import { DirectionBadge } from "@/ui/DirectionBadge"
import { MessageCell as SharedMessageCell } from "@/ui/MessageCell"
import { Pagination } from "@/ui/Pagination"
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
          const { chatName, chatId } = info.row.original

          return (
            <div className="flex items-center gap-2">
              <WhatsappIcon />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm">
                  <Decrypted>{chatName}</Decrypted>
                </span>
                <span className="truncate text-xs text-zinc-500">{chatId}</span>
              </div>
            </div>
          )
        },
      }),
      columnHelper.accessor("senderJid", {
        header: "Sender",
        size: 140,
        cell: (info) => {
          const senderJid = info.getValue()
          const { senderName, isFromMe } = info.row.original

          if (isFromMe) {
            return <span className="text-sm text-zinc-500">You</span>
          }

          return (
            <DemoBlur>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm">
                  <Decrypted>{senderName}</Decrypted>
                </span>
                {senderJid && (
                  <span className="truncate text-xs text-zinc-500">{senderJid}</span>
                )}
              </div>
            </DemoBlur>
          )
        },
      }),
      columnHelper.accessor("text", {
        id: "text",
        header: "Message",
        size: 320,
        cell: (info) => <SharedMessageCell message={info.row.original} />,
      }),
      columnHelper.accessor(sortBy === "syncTime" ? "syncTime" : "timestamp", {
        id: "dateColumn",
        header: sortBy === "syncTime" ? "Received" : "Message Date",
        size: 200,
        cell: (info) => {
          const msg = info.row.original
          const primaryDate =
            sortBy === "syncTime" ? msg.syncTime : msg.timestamp
          const secondaryDate =
            sortBy === "syncTime" ? msg.timestamp : msg.syncTime
          const secondaryLabel = sortBy === "syncTime" ? "sent" : "received"
          return (
            <SharedDateCell
              primaryDate={primaryDate}
              secondaryDate={secondaryDate}
              secondaryLabel={secondaryLabel}
            />
          )
        },
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
      <DataTable
        table={table}
        getRowHref={(row) => `/dashboard/whatsapp/${row.id}`}
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
