"use client"

import { TrashIcon } from "@/ui/icons"
import { useMemo, useState } from "react"
import { formatRelative } from "./formatRelative"
import { TokenInfo } from "./useAccessTokens"

type Props = {
  token: TokenInfo
  onRevoke: () => void
}

function formatMs(ms: number): string {
  const seconds = ms / 1000
  if (seconds < 60) {
    return `${seconds}s`
  }
  const minutes = seconds / 60
  if (minutes < 60) {
    return `${Math.round(minutes)}m`
  }
  const hours = minutes / 60
  if (hours < 24) {
    return `${Math.round(hours)}h`
  }
  const days = hours / 24
  return `${Math.round(days)}d`
}

export function TokenRow({ token, onRevoke }: Props) {
  const [confirming, setConfirming] = useState(false)

  const [now] = useState(() => Date.now())
  const isExpired = useMemo(
    () => token.expiresAt && new Date(token.expiresAt).getTime() < now,
    [token.expiresAt, now]
  )

  const scopeLabels = token.scopes.length === 0 ? ["All access"] : token.scopes

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{token.name}</span>
          {isExpired && (
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400">
              Expired
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {scopeLabels.map((scope) => (
            <span
              key={scope}
              className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
            >
              {scope}
            </span>
          ))}
          {token.dataWindowMs && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              Window: {formatMs(token.dataWindowMs)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
          <code>{token.tokenPrefix}...</code>
          <span>Created {formatRelative(token.createdAt)}</span>
          {token.lastUsedAt && (
            <span>Last used {formatRelative(token.lastUsedAt)}</span>
          )}
          {token.expiresAt && !isExpired && (
            <span>Expires {formatRelative(token.expiresAt)}</span>
          )}
        </div>
      </div>
      <div>
        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Revoke?</span>
            <button
              onClick={() => {
                onRevoke()
                setConfirming(false)
              }}
              className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-500 hover:border-red-300 hover:text-red-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-red-700 dark:hover:text-red-400"
          >
            <TrashIcon size={12} />
            Revoke
          </button>
        )}
      </div>
    </div>
  )
}
