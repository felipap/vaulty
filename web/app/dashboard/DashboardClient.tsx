"use client"

import { useEffect, useState } from "react"
import { logout, getDashboardStats, type DashboardStats } from "../actions"
import { RecentScreenshots } from "./RecentScreenshots"

function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 Bytes"
  }
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  )
}

export function DashboardClient() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getDashboardStats()
      .then((statsData) => {
        setStats(statsData)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-semibold">Context</h1>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Sign Out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {loading ? (
          <p className="text-zinc-500">Loading...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : stats ? (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard
                label="Total Screenshots"
                value={stats.totalScreenshots.toLocaleString()}
              />
              <StatCard
                label="Total Storage"
                value={formatBytes(stats.totalStorageBytes)}
              />
            </div>

            <RecentScreenshots />
          </div>
        ) : null}
      </main>
    </div>
  )
}
