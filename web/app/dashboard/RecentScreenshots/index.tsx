"use client"

import { useEffect, useState } from "react"
import { Item } from "./Item"
import { getRecentScreenshots, type Screenshot } from "./actions"

export function RecentScreenshots() {
  const { screenshots, loading } = useRecentScrenshots()

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Recent Screenshots</h2>
      {loading ? (
        <p className="text-zinc-500">Loading...</p>
      ) : screenshots.length === 0 ? (
        <p className="text-zinc-500">No screenshots yet.</p>
      ) : (
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
                <Item
                  key={screenshot.id}
                  screenshot={screenshot}
                  formatBytes={formatBytes}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function useRecentScrenshots() {
  const [data, setData] = useState<Screenshot[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const screenshots = await getRecentScreenshots()
      setData(screenshots)
      setLoading(false)
    }
    load()
  }, [])
  return { screenshots: data, loading }
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
