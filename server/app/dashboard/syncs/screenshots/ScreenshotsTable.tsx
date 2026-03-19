"use client"

import { DataTable } from "@/ui/indices/DataTable"
import { Pagination } from "@/ui/indices/Pagination"
import { type Screenshot } from "./actions"
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

const columnHelper = createColumnHelper<Screenshot>()

const columns = [
  columnHelper.accessor("id", {
    header: "ID",
    cell: (info) => (
      <span className="font-mono">{info.getValue().slice(0, 8)}...</span>
    ),
  }),
  columnHelper.display({
    id: "dimensions",
    header: "Dimensions",
    cell: ({ row }) => `${row.original.width} × ${row.original.height}`,
  }),
  columnHelper.accessor("sizeBytes", {
    header: "Size",
    cell: (info) => formatBytes(info.getValue()),
  }),
  columnHelper.accessor("capturedAt", {
    header: "Captured",
    cell: (info) => (
      <span className="text-secondary">
        {new Date(info.getValue()).toLocaleString()}
      </span>
    ),
  }),
]

type Props = {
  screenshots: Screenshot[]
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  onPreview: (screenshot: Screenshot) => void
}

export function ScreenshotsTable({
  screenshots,
  page,
  totalPages,
  onPageChange,
  onPreview,
}: Props) {
  const table = useReactTable({
    data: screenshots,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <>
      <DataTable
        table={table}
        onRowClick={(row) => onPreview(row.original)}
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 Bytes"
  }
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}
