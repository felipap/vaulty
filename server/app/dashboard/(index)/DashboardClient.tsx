"use client"

import Link from "next/link"
import { type Route } from "next"
import { useEffect, useState } from "react"
import { ActivityLogs } from "./ActivityLogs"
import { getDashboardStats, type DashboardStats } from "./actions"
import { LoadingState } from "@/ui/PageHeader"

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
    return <LoadingState />
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
        <h2 className="heading-page mb-5">Overview</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Screenshots"
            value={stats.totalScreenshots.toLocaleString()}
            href="/dashboard/syncs/screenshots"
          />
          <StatCard
            label="Storage"
            value={formatBytes(stats.totalStorageBytes)}
            href="/dashboard/syncs/screenshots"
          />
          <StatCard
            label="iMessages"
            value={stats.totalMessages.toLocaleString()}
            href="/dashboard/syncs/imessages"
          />
          <StatCard
            label="Chats"
            value={stats.totalChats.toLocaleString()}
            href="/dashboard/syncs/imessages"
          />
          <StatCard
            label="Contacts"
            value={stats.totalContacts.toLocaleString()}
            href={"/dashboard/syncs/apple-contacts" as Route}
          />
          <StatCard
            label="Locations"
            value={stats.totalLocations.toLocaleString()}
            href="/dashboard/syncs/locations"
          />
          <StatCard
            label="Apple Notes"
            value={stats.totalAppleNotes.toLocaleString()}
            href={"/dashboard/syncs/apple-notes" as Route}
          />
          <StatCard
            label="Apple Reminders"
            value={stats.totalReminders.toLocaleString()}
            href={"/dashboard/syncs/reminders" as Route}
          />
          <StatCard
            label="macOS Stickies"
            value={stats.totalMacosStickies.toLocaleString()}
            href="/dashboard/syncs/mac-stickies"
          />
          <StatCard
            label="Windows Stickies"
            value={stats.totalWinStickies.toLocaleString()}
            href="/dashboard/syncs/win-stickies"
          />
        </div>
      </div>

      <div>
        <h2 className="heading-page mb-5 ">Activity</h2>
        <ActivityLogs />
      </div>
    </div>
  )
}

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
      className="group flex flex-col justify-between rounded-lg border border-neutral-200 p-4 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"
    >
      <p className="text-sm text-secondary">{label}</p>
      <p className="mt-2 font-mono text-2xl tracking-tight text-contrast">
        {value}
      </p>
      <p className="mt-2 text-xs text-tertiary transition-colors group-hover:text-secondary">
        View &rarr;
      </p>
    </Link>
  )
}
