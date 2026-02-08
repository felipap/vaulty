"use client"

import { CopyIcon, CheckIcon, PlusIcon, KeyIcon } from "@/ui/icons"
import { useEffect, useState } from "react"
import { createToken, getAccessTokens, revokeToken } from "../actions"
import { TokenRow } from "./TokenRow"

export type TokenInfo = {
  id: string
  name: string
  tokenPrefix: string
  expiresAt: string | null
  lastUsedAt: string | null
  createdAt: string
}

export function AccessTokens() {
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newTokenName, setNewTokenName] = useState("")
  const [expiresInDays, setExpiresInDays] = useState<string>("")
  const [creating, setCreating] = useState(false)
  const [revealedToken, setRevealedToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadTokens()
  }, [])

  async function loadTokens() {
    setLoading(true)
    const result = await getAccessTokens()
    setTokens(result)
    setLoading(false)
  }

  async function handleCreate() {
    if (!newTokenName.trim()) {
      return
    }
    setCreating(true)
    const days = expiresInDays ? parseInt(expiresInDays, 10) : undefined
    const result = await createToken(newTokenName.trim(), days)
    setRevealedToken(result.token)
    setNewTokenName("")
    setExpiresInDays("")
    setShowCreate(false)
    setCreating(false)
    await loadTokens()
  }

  async function handleRevoke(id: string) {
    await revokeToken(id)
    await loadTokens()
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyIcon size={18} />
          <h2 className="text-lg font-semibold">Access Tokens</h2>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          <PlusIcon size={14} />
          Create Token
        </button>
      </div>

      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Tokens grant read access to your data via the API. Use them to connect
        AI assistants, scripts, or other tools.
      </p>

      {revealedToken && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-sm font-medium text-green-800 dark:text-green-300">
            Token created. Copy it now — it won't be shown again.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 rounded bg-green-100 px-3 py-2 font-mono text-xs text-green-900 dark:bg-green-900/40 dark:text-green-200">
              {revealedToken}
            </code>
            <button
              onClick={() => handleCopy(revealedToken)}
              className="flex items-center gap-1 rounded-md border border-green-300 px-2.5 py-1.5 text-sm text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900/40"
            >
              {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <button
            onClick={() => setRevealedToken(null)}
            className="mt-2 text-xs text-green-600 hover:text-green-700 dark:text-green-400"
          >
            Dismiss
          </button>
        </div>
      )}

      {showCreate && (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <input
                type="text"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder='e.g. "Claude Code", "MCP Server"'
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Expires in (days)
              </label>
              <input
                type="number"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                placeholder="Leave empty for no expiration"
                min="1"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!newTokenName.trim() || creating}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create"}
              </button>
              <button
                onClick={() => {
                  setShowCreate(false)
                  setNewTokenName("")
                  setExpiresInDays("")
                }}
                className="rounded-md border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading tokens...</p>
        ) : tokens.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No access tokens yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-700 dark:border-zinc-700">
            {tokens.map((token) => (
              <TokenRow
                key={token.id}
                token={token}
                onRevoke={() => handleRevoke(token.id)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
