"use client"

import { CopyButton } from "@/ui/CopyButton"

type Props = {
  label: string
  value: string
  copyable?: boolean
}

export function InfoRow({ label, value, copyable }: Props) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-zinc-500">
        {label}
      </label>
      <div className="flex min-w-0 items-center gap-2">
        <p className="truncate text-sm text-zinc-800 dark:text-zinc-200">{value}</p>
        {copyable && <CopyButton text={value} />}
      </div>
    </div>
  )
}
