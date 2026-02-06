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

const defaultTdClassName = "px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400"

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
      router.push(
        getRowHref(row) as Parameters<typeof router.push>[0]
      )
    }
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table
        className={tableClassName}
        style={getTdStyle ? { tableLayout: "fixed" } : undefined}
      >
        <thead className="bg-zinc-50 dark:bg-zinc-900">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-sm font-medium text-zinc-500"
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
        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => handleRowClick(row)}
              className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
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
