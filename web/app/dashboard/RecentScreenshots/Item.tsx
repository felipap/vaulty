"use client"

import { useState } from "react"
import type { Screenshot } from "./actions"
import { PreviewModal } from "./PreviewModal"

type Props = {
  screenshot: Screenshot
  formatBytes: (bytes: number) => string
}

export function Item({ screenshot, formatBytes }: Props) {
  const [showPreview, setShowPreview] = useState(false)

  return (
    <>
      <tr
        onClick={() => setShowPreview(true)}
        className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
      >
        <td className="px-4 py-3 text-sm font-mono">
          {screenshot.id.slice(0, 8)}...
        </td>
        <td className="px-4 py-3 text-sm">
          {screenshot.width} × {screenshot.height}
        </td>
        <td className="px-4 py-3 text-sm">
          {formatBytes(screenshot.sizeBytes)}
        </td>
        <td className="px-4 py-3 text-sm text-zinc-500">
          {new Date(screenshot.capturedAt).toLocaleString()}
        </td>
      </tr>

      {showPreview && (
        <PreviewModal
          screenshot={screenshot}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  )
}
