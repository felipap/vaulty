"use client"

import { useState } from "react"
import { CheckIcon, CopyIcon } from "@/ui/icons"

type Props = {
  data: unknown
}

export function RawJson({ data }: Props) {
  const [copied, setCopied] = useState(false)
  const json = JSON.stringify(data, null, 2)

  function handleCopy() {
    navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-secondary">Raw JSON</label>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-secondary hover:text-secondary"
          title="Copy raw JSON"
        >
          {copied ? (
            <>
              <CheckIcon size={12} /> Copied
            </>
          ) : (
            <>
              <CopyIcon size={12} /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="whitespace-pre-wrap break-all rounded-lg bg-zinc-50 p-4 font-mono text-sm text-contrast dark:bg-zinc-950">
        {json}
      </pre>
    </div>
  )
}
