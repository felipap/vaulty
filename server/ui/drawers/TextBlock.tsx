"use client"

import { useState } from "react"
import { CopyButton } from "@/ui/CopyButton"
import { ChevronDownIcon } from "@/ui/icons"

type Props = {
  label: string
  children: React.ReactNode
  copyText?: string
  foldable?: boolean
}

export function TextBlock({ label, children, copyText, foldable }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm font-medium text-secondary">{label}</label>
        {copyText && <CopyButton text={copyText} />}
      </div>
      <div className="relative">
        <div
          className={`rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950 overflow-hidden transition-all ${
            foldable && !expanded ? "max-h-[300px]" : ""
          }`}
        >
          {children}
        </div>
        {foldable && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="absolute inset-x-0 bottom-0 flex items-center justify-center rounded-b-lg bg-zinc-100 py-2 text-secondary hover:text-contrast dark:bg-zinc-900"
          >
            <ChevronDownIcon size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
