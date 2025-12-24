"use client"

import { useState } from "react"
import { type Device } from "../../actions"

type Props = {
  device: Device
  onApprove: (id: string) => void
  onDelete: (id: string) => void
}

export function DeviceRow({ device, onApprove, onDelete }: Props) {
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
      <td className="px-4 py-3 text-sm font-mono">
        {device.deviceId.slice(0, 8)}...
      </td>
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
        {device.lastSeenAt
          ? new Date(device.lastSeenAt).toLocaleString()
          : "Never"}
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


