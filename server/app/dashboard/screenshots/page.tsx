"use client"

import { useEffect, useState } from "react"
import {
  getScreenshotRetentionHours,
  getScreenshots,
  type Screenshot,
} from "./actions"
import { ScreenshotPreview } from "./ScreenshotPreview"
import { ScreenshotsTable } from "./ScreenshotsTable"
import {
  PageHeader,
  PageCount,
  EmptyState,
  LoadingState,
} from "@/ui/PageHeader"

const IS_DEV = process.env.NODE_ENV === "development"

function formatRetention(hours: number): string {
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"}`
  }
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? "" : "s"}`
}

export default function Page() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [retentionHours, setRetentionHours] = useState<number | null>(null)
  const [previewScreenshot, setPreviewScreenshot] = useState<Screenshot | null>(
    null
  )

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [data, retention] = await Promise.all([
        getScreenshots(page),
        getScreenshotRetentionHours(),
      ])
      setScreenshots(data.screenshots)
      setTotalPages(data.totalPages)
      setTotal(data.total)
      setRetentionHours(retention)
      setLoading(false)
    }
    load()
  }, [page])

  let inner
  if (loading) {
    inner = <LoadingState />
  } else if (screenshots.length === 0) {
    inner = <EmptyState message="No screenshots yet." />
  } else {
    inner = (
      <ScreenshotsTable
        screenshots={screenshots}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onPreview={setPreviewScreenshot}
      />
    )
  }

  return (
    <div>
      <PageHeader
        title="Screenshots"
        subtitle={
          retentionHours !== null ? (
            <p className="text-sm text-secondary mt-1">
              Auto-delete after {formatRetention(retentionHours)} (set{" "}
              <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-xs">
                SCREENSHOT_RETENTION_HOURS
              </code>{" "}
              env var to change) {IS_DEV ? "(inactive in dev)" : ""}
            </p>
          ) : undefined
        }
      >
        {total > 0 && <PageCount total={total} />}
      </PageHeader>

      {inner}

      {previewScreenshot && (
        <ScreenshotPreview
          screenshot={previewScreenshot}
          onClose={() => setPreviewScreenshot(null)}
        />
      )}
    </div>
  )
}
