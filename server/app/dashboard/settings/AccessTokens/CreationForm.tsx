"use client"

import { useState } from "react"
import { VALID_SCOPES } from "@/lib/access-tokens.shared"
import { Item } from "./Item"

const SCOPE_LABELS: Record<string, string> = {
  contacts: "Contacts",
  imessages: "iMessages",
  whatsapp: "WhatsApp",
  screenshots: "Screenshots",
  locations: "Locations",
}

const inputClassName =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700"

type Props = {
  onCreate: (
    name: string,
    days: number | undefined,
    scopes: string[],
    windowMs: number | undefined
  ) => Promise<void>
  onCancel: () => void
}

export function CreationForm({ onCreate, onCancel }: Props) {
  const [name, setName] = useState("")
  const [expiresInDays, setExpiresInDays] = useState("")
  const [dataWindowMs, setDataWindowMs] = useState("")
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(
    new Set(VALID_SCOPES)
  )
  const [creating, setCreating] = useState(false)

  function toggleScope(scope: string) {
    setSelectedScopes((prev) => {
      const next = new Set(prev)
      if (next.has(scope)) {
        next.delete(scope)
      } else {
        next.add(scope)
      }
      return next
    })
  }

  async function handleCreate() {
    if (!name.trim() || selectedScopes.size === 0) {
      return
    }
    setCreating(true)
    const days = expiresInDays ? parseInt(expiresInDays, 10) : undefined
    const windowMs = dataWindowMs ? parseInt(dataWindowMs, 10) : undefined
    const allSelected = selectedScopes.size === VALID_SCOPES.length
    const scopes = allSelected ? [] : [...selectedScopes]
    await onCreate(name.trim(), days, scopes, windowMs)
    setCreating(false)
  }

  return (
    <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
      <div className="flex flex-col gap-3">
        <Item label="Name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder='e.g. "Claude Code", "MCP Server"'
            className={inputClassName}
            autoFocus
          />
        </Item>
        <Item label="Expires in (days)">
          <input
            type="number"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value)}
            placeholder="Leave empty for no expiration"
            min="1"
            className={inputClassName}
          />
        </Item>
        <Item
          label="Data window (ms)"
          description="Restricts reads to data within this many ms from now. e.g. 172800000 = 2 days"
        >
          <input
            type="number"
            value={dataWindowMs}
            onChange={(e) => setDataWindowMs(e.target.value)}
            placeholder="Leave empty for unlimited access"
            min="1"
            className={inputClassName}
          />
        </Item>
        <Item label="Scopes">
          <div className="flex flex-wrap gap-2">
            {VALID_SCOPES.map((scope) => (
              <label
                key={scope}
                className="flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm select-none hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-700"
              >
                <input
                  type="checkbox"
                  checked={selectedScopes.has(scope)}
                  onChange={() => toggleScope(scope)}
                  className="rounded"
                />
                {SCOPE_LABELS[scope] ?? scope}
              </label>
            ))}
          </div>
          {selectedScopes.size === 0 && (
            <p className="mt-1 text-xs text-red-500">
              Select at least one scope
            </p>
          )}
        </Item>
        <div className="flex gap-2">
          <button
            onClick={handleCreate}
            disabled={!name.trim() || selectedScopes.size === 0 || creating}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create"}
          </button>
          <button
            onClick={onCancel}
            className="rounded-md border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
