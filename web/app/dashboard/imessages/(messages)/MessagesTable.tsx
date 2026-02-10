"use client"

import { useMemo } from "react"
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { DataTable } from "@/ui/DataTable"
import { DemoBlur } from "@/ui/DemoBlur"
import { DateCell as SharedDateCell } from "@/ui/DateCell"
import { DirectionBadge } from "@/ui/DirectionBadge"
import { MessageCell as SharedMessageCell } from "@/ui/MessageCell"
import { Pagination } from "@/ui/Pagination"
import { type Message, type SortBy } from "./actions"
import { type ContactLookup } from "../chats/actions"

export type DecryptedMessage = Message & { decryptedText: string | null }

type Props = {
  messages: DecryptedMessage[]
  contactLookup: ContactLookup
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  sortBy: SortBy
}

const columnHelper = createColumnHelper<DecryptedMessage>()

export function MessagesTable({
  messages,
  contactLookup,
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
      columnHelper.accessor("contact", {
        header: "Contact",
        size: 180,
        cell: (info) => {
          const contact = info.getValue()
          const resolvedName = resolveContactName(contact, contactLookup)
          const hasContactName = resolvedName !== formatContact(contact)

          return (
            <div className="flex items-center gap-2">
              <ServiceIcon service={info.row.original.service} />
              <DemoBlur>
                <div className="flex flex-col">
                  <span className="text-sm">{resolvedName}</span>
                  {hasContactName && (
                    <span className="text-xs text-zinc-500">
                      {formatContact(contact)}
                    </span>
                  )}
                </div>
              </DemoBlur>
            </div>
          )
        },
      }),
      columnHelper.accessor("text", {
        id: "text",
        header: "Message",
        size: 320,
        cell: (info) => <SharedMessageCell message={info.row.original} />,
      }),
      columnHelper.accessor(sortBy === "syncTime" ? "syncTime" : "date", {
        id: "dateColumn",
        header: sortBy === "syncTime" ? "Received" : "Message Date",
        size: 200,
        cell: (info) => {
          const msg = info.row.original
          const primaryDate = sortBy === "syncTime" ? msg.syncTime : msg.date
          const secondaryDate = sortBy === "syncTime" ? msg.date : msg.syncTime
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
    [sortBy, contactLookup]
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
        getRowHref={(row) => `/dashboard/imessages/${row.id}`}
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

function resolveContactName(
  contact: string,
  contactLookup: ContactLookup
): string {
  // Try lookup by email (lowercase)
  if (contact.includes("@")) {
    const name = contactLookup[contact.toLowerCase().trim()]
    if (name) {
      return name
    }
    return contact
  }

  // Try lookup by normalized phone number
  const normalizedPhone = contact.replace(/\D/g, "")
  const name = contactLookup[normalizedPhone]
  if (name) {
    return name
  }

  // Fall back to formatted contact
  return formatContact(contact)
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
