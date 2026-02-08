"use client"

import { useEffect, useState } from "react"
import { twMerge } from "tailwind-merge"
import {
  getRecentWriteLogs,
  getRecentReadLogs,
  type WriteLogEntry,
  type ReadLogEntry,
} from "./actions"

type LogTab = "writes" | "reads"

export function ActivityLogs() {
  const [activeTab, setActiveTab] = useState<LogTab>("writes")
  const { writeLogs, readLogs, loading } = useActivityLogs()

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setActiveTab("writes")}
          className={twMerge(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            activeTab === "writes"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          )}
        >
          Writes
        </button>
        <button
          onClick={() => setActiveTab("reads")}
          className={twMerge(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            activeTab === "reads"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          )}
        >
          Reads
        </button>
      </div>

      {loading ? (
        <p className="text-zinc-500">Loading...</p>
      ) : activeTab === "writes" ? (
        <WriteLogsTable logs={writeLogs} />
      ) : (
        <ReadLogsTable logs={readLogs} />
      )}
    </div>
  )
}

function WriteLogsTable({ logs }: { logs: WriteLogEntry[] }) {
  if (logs.length === 0) {
    return <p className="text-zinc-500">No write activity yet.</p>
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
              Type
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
              Description
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
              Count
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
              Token
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
              Time
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
          {logs.map((log) => (
            <tr
              key={log.id}
              className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              <td className="px-4 py-3">
                <TypeBadge type={log.type} variant="write" />
              </td>
              <td className="px-4 py-3 text-sm">{log.description}</td>
              <td className="px-4 py-3 text-sm tabular-nums">
                {log.count.toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <TokenLabel prefix={log.tokenPrefix} />
              </td>
              <td className="px-4 py-3 text-sm text-zinc-500">
                {formatRelativeTime(new Date(log.createdAt))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ReadLogsTable({ logs }: { logs: ReadLogEntry[] }) {
  if (logs.length === 0) {
    return <p className="text-zinc-500">No read activity yet.</p>
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
              Type
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
              Description
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
              Items
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
              Token
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
              Time
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
          {logs.map((log) => (
            <tr
              key={log.id}
              className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              <td className="px-4 py-3">
                <TypeBadge type={log.type} variant="read" />
              </td>
              <td className="px-4 py-3 text-sm">{log.description}</td>
              <td className="px-4 py-3 text-sm tabular-nums">
                {log.count?.toLocaleString() ?? "—"}
              </td>
              <td className="px-4 py-3">
                <TokenLabel prefix={log.tokenPrefix} />
              </td>
              <td className="px-4 py-3 text-sm text-zinc-500">
                {formatRelativeTime(new Date(log.createdAt))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type TypeBadgeProps = {
  type: string
  variant: "write" | "read"
}

function TokenLabel({ prefix }: { prefix: string | null }) {
  if (!prefix) {
    return <span className="text-xs text-zinc-400">—</span>
  }
  return (
    <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
      {prefix}...
    </code>
  )
}

function TypeBadge({ type, variant }: TypeBadgeProps) {
  const colors =
    variant === "write"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"

  return (
    <span className={twMerge("rounded-full px-2 py-0.5 text-xs font-medium", colors)}>
      {type}
    </span>
  )
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return "Just now"
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }
  if (diffDays === 1) {
    return "Yesterday"
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" })
}

function useActivityLogs() {
  const [writeLogs, setWriteLogs] = useState<WriteLogEntry[]>([])
  const [readLogs, setReadLogs] = useState<ReadLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getRecentWriteLogs(), getRecentReadLogs()])
      .then(([writes, reads]) => {
        setWriteLogs(writes)
        setReadLogs(reads)
      })
      .finally(() => setLoading(false))
  }, [])

  return { writeLogs, readLogs, loading }
}
