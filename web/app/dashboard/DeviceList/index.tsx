"use client"

import { type Device } from "../../actions"
import { DeviceRow } from "./Row"

type Props = {
  devices: Device[]
  onApprove: (id: string) => void
  onDelete: (id: string) => void
}

export function DeviceList({ devices, onApprove, onDelete }: Props) {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Devices</h2>
      {devices.length === 0 ? (
        <p className="text-zinc-500">
          No devices registered yet. Open the Context desktop app to register a
          device.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                  Device ID
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                  Last Seen
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
              {devices.map((device) => (
                <DeviceRow
                  key={device.id}
                  device={device}
                  onApprove={onApprove}
                  onDelete={onDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


