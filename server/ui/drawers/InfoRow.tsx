"use client"

import { CopyButton } from "@/ui/CopyButton"
import { type ReactNode } from "react"

type Props = {
  label: string
  value?: string
  copyable?: boolean
  children?: ReactNode
}

export function InfoRow({ label, value, copyable, children }: Props) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-secondary">
        {label}
      </label>
      <div className="flex min-w-0 items-center gap-2">
        <p className="truncate text-sm text-contrast">{children ?? value}</p>
        {copyable && value && <CopyButton text={value} />}
      </div>
    </div>
  )
}
