"use client"

import { useEffect, useState, useCallback } from "react"
import { getLocations, type Location } from "./actions"
import { Pagination } from "@/ui/Pagination"
import { MapPinIcon, LockIcon } from "@/ui/icons"
import {
  PageHeader,
  PageCount,
  EmptyState,
  LoadingState,
} from "@/ui/PageHeader"
import { decryptText, isEncrypted, getEncryptionKey } from "@/lib/encryption"

export type DecryptedLocation = Location & {
  decryptedLatitude: string | null
  decryptedLongitude: string | null
  isLocationEncrypted: boolean
}

export default function Page() {
  const [locations, setLocations] = useState<DecryptedLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const decryptLocations = useCallback(
    async (locs: Location[]): Promise<DecryptedLocation[]> => {
      const encryptionKey = getEncryptionKey()
      return Promise.all(
        locs.map(async (loc) => {
          const latEncrypted = isEncrypted(loc.latitude)
          const lonEncrypted = isEncrypted(loc.longitude)
          const isLocationEncrypted = latEncrypted || lonEncrypted

          if (!isLocationEncrypted) {
            return {
              ...loc,
              decryptedLatitude: loc.latitude,
              decryptedLongitude: loc.longitude,
              isLocationEncrypted: false,
            }
          }

          if (!encryptionKey) {
            return {
              ...loc,
              decryptedLatitude: null,
              decryptedLongitude: null,
              isLocationEncrypted: true,
            }
          }

          const [decryptedLat, decryptedLon] = await Promise.all([
            latEncrypted
              ? decryptText(loc.latitude, encryptionKey)
              : loc.latitude,
            lonEncrypted
              ? decryptText(loc.longitude, encryptionKey)
              : loc.longitude,
          ])

          return {
            ...loc,
            decryptedLatitude: decryptedLat,
            decryptedLongitude: decryptedLon,
            isLocationEncrypted: true,
          }
        })
      )
    },
    []
  )

  useEffect(() => {
    async function load() {
      setLoading(true)
      const data = await getLocations(page)
      const decrypted = await decryptLocations(data.locations)
      setLocations(decrypted)
      setTotalPages(data.totalPages)
      setTotal(data.total)
      setLoading(false)
    }
    load()
  }, [page, decryptLocations])

  let inner
  if (loading) {
    inner = <LoadingState />
  } else if (locations.length === 0) {
    inner = <EmptyState message="No locations yet." />
  } else {
    inner = (
      <>
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Coordinates</th>
                <th className="px-4 py-3 font-medium">Accuracy</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {locations.map((location) => (
                <LocationRow key={location.id} location={location} />
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
    )
  }

  return (
    <div>
      <PageHeader title="Locations">
        {total > 0 && <PageCount total={total} />}
      </PageHeader>

      {inner}
    </div>
  )
}

function LocationRow({ location }: { location: DecryptedLocation }) {
  const hasCoordinates =
    location.decryptedLatitude !== null && location.decryptedLongitude !== null
  const mapsUrl = hasCoordinates
    ? `https://www.google.com/maps?q=${location.decryptedLatitude},${location.decryptedLongitude}`
    : null

  return (
    <tr className="bg-white transition-colors hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900">
      <td className="px-4 py-3">
        <span className="text-contrast">
          {formatDate(location.timestamp)}
        </span>
        <span className="ml-2 text-secondary">
          {formatTime(location.timestamp)}
        </span>
      </td>
      <td className="px-4 py-3 font-mono text-xs text-secondary">
        {hasCoordinates ? (
          <span className="flex items-center gap-1.5">
            {location.isLocationEncrypted && (
              <span className="text-green-500" title="Decrypted">
                <LockIcon size={12} />
              </span>
            )}
            {location.decryptedLatitude}, {location.decryptedLongitude}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 italic text-amber-500">
            <LockIcon size={12} />
            Encrypted - enter key to decrypt
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        {location.accuracy !== null ? (
          <span className="text-secondary">
            ±{location.accuracy}m
          </span>
        ) : (
          <span className="text-secondary">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <MapPinIcon className="h-3.5 w-3.5" />
            View
          </a>
        ) : (
          <span className="text-secondary">—</span>
        )}
      </td>
    </tr>
  )
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}
