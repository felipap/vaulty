"use client"

import { useState } from "react"
import { CheckIcon, CopyIcon, ChevronDownIcon } from "@/ui/icons"

type Props = {
  data: unknown
}

export function RawJson({ data }: Props) {
  const [expanded, setExpanded] = useState(false)
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
          className="flex items-center gap-1 text-xs text-secondary hover:text-contrast"
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
      <div className="relative">
        <pre
          className={`whitespace-pre-wrap break-all rounded-lg bg-zinc-50 p-4 font-mono text-sm text-contrast dark:bg-zinc-950 overflow-hidden transition-all ${
            expanded ? "" : "max-h-[300px]"
          }`}
        >
          {json}
        </pre>
        {!expanded && (
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
