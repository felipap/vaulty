"use client"

import Link from "next/link"
import { type Route } from "next"
import { useEffect, useState } from "react"
import { ActivityLogs } from "./ActivityLogs"
import { getDashboardStats, type DashboardStats } from "./actions"

function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 B"
  }
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

type StatCardProps = {
  label: string
  value: string
  href: Route
}

function StatCard({ label, value, href }: StatCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col justify-between rounded-lg border border-neutral-200 p-5 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"
    >
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-3 font-mono text-2xl tracking-tight text-neutral-900 dark:text-neutral-100">
        {value}
      </p>
      <p className="mt-3 text-xs text-neutral-400 transition-colors group-hover:text-neutral-600 dark:text-neutral-600 dark:group-hover:text-neutral-400">
        View &rarr;
      </p>
    </Link>
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

  if (loading) {
    return <p className="font-mono text-sm text-neutral-400">Loading...</p>
  }

  if (error) {
    return <p className="font-mono text-sm text-red-500">{error}</p>
  }

  if (!stats) {
    return null
  }

  return (
    <div className="space-y-10">
      <div>
        <h2 className="mb-5 heading-label">
          Overview
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Screenshots"
            value={stats.totalScreenshots.toLocaleString()}
            href="/dashboard/screenshots"
          />
          <StatCard
            label="Storage"
            value={formatBytes(stats.totalStorageBytes)}
            href="/dashboard/screenshots"
          />
          <StatCard
            label="iMessages"
            value={stats.totalMessages.toLocaleString()}
            href="/dashboard/imessages"
          />
          <StatCard
            label="Chats"
            value={stats.totalChats.toLocaleString()}
            href="/dashboard/imessages"
          />
          <StatCard
            label="Contacts"
            value={stats.totalContacts.toLocaleString()}
            href={"/dashboard/icontacts" as Route}
          />
          <StatCard
            label="Locations"
            value={stats.totalLocations.toLocaleString()}
            href="/dashboard/locations"
          />
          <StatCard
            label="Stickies"
            value={stats.totalStickies.toLocaleString()}
            href="/dashboard/stickies"
          />
        </div>
      </div>

      <div>
        <h2 className="mb-5 heading-label">
          Activity
        </h2>
        <ActivityLogs />
      </div>
    </div>
  )
}
