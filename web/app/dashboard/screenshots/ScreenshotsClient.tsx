"use client"

import { useEffect, useState } from "react"
import { getScreenshots, getScreenshotData, type Screenshot } from "./actions"
import { Pagination } from "@/ui/Pagination"

export function ScreenshotsClient() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    setLoading(true)
    getScreenshots(page)
      .then((data) => {
        setScreenshots(data.screenshots)
        setTotalPages(data.totalPages)
        setTotal(data.total)
      })
      .finally(() => setLoading(false))
  }, [page])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Screenshots</h1>
        <span className="text-sm text-zinc-500">{total.toLocaleString()} total</span>
      </div>

      {loading ? (
        <p className="text-zinc-500">Loading...</p>
      ) : screenshots.length === 0 ? (
        <p className="text-zinc-500">No screenshots yet.</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                    Dimensions
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                    Size
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                    Captured
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                {screenshots.map((screenshot) => (
                  <ScreenshotRow key={screenshot.id} screenshot={screenshot} />
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}

function ScreenshotRow({ screenshot }: { screenshot: Screenshot }) {
  const [showPreview, setShowPreview] = useState(false)

  return (
    <>
      <tr
        onClick={() => setShowPreview(true)}
        className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
      >
        <td className="px-4 py-3 font-mono text-sm">
          {screenshot.id.slice(0, 8)}...
        </td>
        <td className="px-4 py-3 text-sm">
          {screenshot.width} × {screenshot.height}
        </td>
        <td className="px-4 py-3 text-sm">{formatBytes(screenshot.sizeBytes)}</td>
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

type PreviewModalProps = {
  screenshot: Screenshot
  onClose: () => void
}

function PreviewModal({ screenshot, onClose }: PreviewModalProps) {
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

function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 Bytes"
  }
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}


