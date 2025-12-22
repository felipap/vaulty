"use client"

import { useEffect, useState, useCallback } from "react"
import { logout } from "../actions"

type DashboardStats = {
  totalScreenshots: number
  totalStorageBytes: number
  recentScreenshots: {
    id: string
    width: number
    height: number
    sizeBytes: number
    capturedAt: string
  }[]
}

type Device = {
  id: string
  deviceId: string
  name: string | null
  approved: boolean
  lastSeenAt: string | null
  createdAt: string
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const response = await fetch("/api/dashboard")
  if (!response.ok) {
    throw new Error("Failed to fetch dashboard stats")
  }
  return response.json()
}

async function fetchDevices(): Promise<Device[]> {
  const response = await fetch("/api/devices")
  if (!response.ok) {
    throw new Error("Failed to fetch devices")
  }
  return response.json()
}

async function approveDevice(id: string): Promise<void> {
  const response = await fetch(`/api/devices/${id}/approve`, { method: "POST" })
  if (!response.ok) {
    throw new Error("Failed to approve device")
  }
}

async function deleteDevice(id: string): Promise<void> {
  const response = await fetch(`/api/devices/${id}/approve`, { method: "DELETE" })
  if (!response.ok) {
    throw new Error("Failed to delete device")
  }
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  )
}

function DeviceRow({
  device,
  onApprove,
  onDelete,
}: {
  device: Device
  onApprove: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [loading, setLoading] = useState(false)

  const handleApprove = async () => {
    setLoading(true)
    await onApprove(device.id)
    setLoading(false)
  }

  const handleDelete = async () => {
    setLoading(true)
    await onDelete(device.id)
    setLoading(false)
  }

  return (
    <tr>
      <td className="px-4 py-3 text-sm font-mono">{device.deviceId.slice(0, 8)}...</td>
      <td className="px-4 py-3 text-sm">{device.name || "Unknown"}</td>
      <td className="px-4 py-3 text-sm">
        {device.approved ? (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Approved
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            Pending
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-zinc-500">
        {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : "Never"}
      </td>
      <td className="px-4 py-3 text-sm">
        <div className="flex gap-2">
          {!device.approved && (
            <button
              onClick={handleApprove}
              disabled={loading}
              className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
            >
              Approve
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={loading}
            className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </td>
    </tr>
  )
}

export function DashboardClient() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDevices = useCallback(async () => {
    const deviceList = await fetchDevices()
    setDevices(deviceList)
  }, [])

  useEffect(() => {
    Promise.all([fetchDashboardStats(), fetchDevices()])
      .then(([statsData, deviceList]) => {
        setStats(statsData)
        setDevices(deviceList)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleApproveDevice = async (id: string) => {
    await approveDevice(id)
    await loadDevices()
  }

  const handleDeleteDevice = async (id: string) => {
    await deleteDevice(id)
    await loadDevices()
  }

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
              <StatCard label="Total Screenshots" value={stats.totalScreenshots.toLocaleString()} />
              <StatCard label="Total Storage" value={formatBytes(stats.totalStorageBytes)} />
            </div>

            <div>
              <h2 className="mb-4 text-lg font-semibold">Devices</h2>
              {devices.length === 0 ? (
                <p className="text-zinc-500">
                  No devices registered yet. Open the Context desktop app to register a device.
                </p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <table className="w-full">
                    <thead className="bg-zinc-50 dark:bg-zinc-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">Device ID</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">Last Seen</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                      {devices.map((device) => (
                        <DeviceRow
                          key={device.id}
                          device={device}
                          onApprove={handleApproveDevice}
                          onDelete={handleDeleteDevice}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h2 className="mb-4 text-lg font-semibold">Recent Screenshots</h2>
              {stats.recentScreenshots.length === 0 ? (
                <p className="text-zinc-500">No screenshots yet.</p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <table className="w-full">
                    <thead className="bg-zinc-50 dark:bg-zinc-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">ID</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">Dimensions</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">Size</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">Captured</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                      {stats.recentScreenshots.map((screenshot) => (
                        <tr key={screenshot.id}>
                          <td className="px-4 py-3 text-sm font-mono">{screenshot.id.slice(0, 8)}...</td>
                          <td className="px-4 py-3 text-sm">
                            {screenshot.width} × {screenshot.height}
                          </td>
                          <td className="px-4 py-3 text-sm">{formatBytes(screenshot.sizeBytes)}</td>
                          <td className="px-4 py-3 text-sm text-zinc-500">
                            {new Date(screenshot.capturedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}


