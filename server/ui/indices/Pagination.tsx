"use client"

import { twMerge } from "tailwind-merge"

type Props = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) {
    return null
  }

  const pages = getPageNumbers(page, totalPages)

  return (
    <div className="mt-6 flex items-center justify-center gap-1">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-1.5 text-sm font-medium text-secondary transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-neutral-800"
      >
        Previous
      </button>

      {pages.map((p, i) => {
        if (p === "...") {
          return (
            <span key={`ellipsis-${i}`} className="px-1 text-secondary">
              ...
            </span>
          )
        }

        return (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={twMerge(
              "min-w-[32px] px-2 py-1.5 font-mono text-sm font-medium transition-colors",
              p === page
                ? "bg-neutral-900 text-inverted dark:bg-neutral-100"
                : "text-secondary hover:bg-neutral-100 dark:hover:bg-neutral-800"
            )}
          >
            {p}
          </button>
        )
      })}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-1.5 text-sm font-medium text-secondary transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-neutral-800"
      >
        Next
      </button>
    </div>
  )
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  if (current <= 3) {
    return [1, 2, 3, 4, 5, "...", total]
  }

  if (current >= total - 2) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total]
  }

  return [1, "...", current - 1, current, current + 1, "...", total]
}
