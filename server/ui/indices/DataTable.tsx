"use client"

import type { Cell, Row, Table } from "@tanstack/react-table"
import { flexRender } from "@tanstack/react-table"
import { useRouter } from "next/navigation"
import { twMerge } from "tailwind-merge"

type BaseProps<TData> = {
  table: Table<TData>
  tableClassName?: string
  getTdClassName?: (cell: Cell<TData, unknown>) => string
  getTdStyle?: (cell: Cell<TData, unknown>) => React.CSSProperties
}
type Props<TData> = BaseProps<TData> &
  (
    | { getRowHref: (row: Row<TData>) => string; onRowClick?: never }
    | { onRowClick: (row: Row<TData>) => void; getRowHref?: never }
  )

const defaultTdClassName = "px-4 py-2.5 text-sm text-contrast/60"

export function DataTable<TData>({
  table,
  getRowHref,
  onRowClick,
  tableClassName = "w-full",
  getTdClassName,
  getTdStyle,
}: Props<TData>) {
  const router = useRouter()

  function handleRowClick(row: Row<TData>) {
    if (onRowClick) {
      onRowClick(row)
    } else if (getRowHref) {
      router.push(getRowHref(row) as Parameters<typeof router.push>[0])
    }
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
      <table
        className={twMerge("w-full", tableClassName)}
        style={getTdStyle ? { tableLayout: "fixed" } : undefined}
      >
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="border-b border-neutral-200 dark:border-neutral-800"
            >
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-2.5 text-left text-sm font-450 text-contrast/80"
                  style={
                    getTdStyle
                      ? {
                          width: header.getSize(),
                          maxWidth: header.getSize(),
                        }
                      : undefined
                  }
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
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => handleRowClick(row)}
              className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className={twMerge(
                    defaultTdClassName,
                    getTdClassName?.(cell)
                  )}
                  style={getTdStyle?.(cell)}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
