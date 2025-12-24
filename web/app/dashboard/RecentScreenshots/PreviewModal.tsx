"use client"

import { useEffect, useState } from "react"
import { getScreenshotData } from "./actions"
import type { Screenshot } from "./actions"

type Props = {
  screenshot: Screenshot
  onClose: () => void
}

export function PreviewModal({ screenshot, onClose }: Props) {
  const [imageData, setImageData] = useState<string | null>(null)

  useEffect(() => {
    getScreenshotData(screenshot.id).then(setImageData)
  }, [screenshot.id])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <span className="text-sm font-medium">
            {screenshot.width} × {screenshot.height}
          </span>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="flex min-h-[200px] items-center justify-center overflow-auto p-2">
          {imageData ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageData}
              alt={`Screenshot ${screenshot.id}`}
              className="max-h-[80vh] rounded-lg object-contain"
            />
          ) : (
            <span className="text-zinc-500">Loading...</span>
          )}
        </div>
      </div>
    </div>
  )
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
