"use client"

import { CopyIcon, CheckIcon, PlusIcon, KeyIcon } from "@/ui/icons"
import { useState } from "react"
import { TokenRow } from "./TokenRow"
import { useAccessTokens } from "./useAccessTokens"
import { CreationForm } from "./CreationForm"
import { Button } from "@/ui/Button"

export function AccessTokens() {
  const { tokens, loading, create, revoke } = useAccessTokens()
  const [showCreate, setShowCreate] = useState(false)
  const [revealedToken, setRevealedToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleCreate(
    name: string,
    days: number | undefined,
    scopes: string[],
    windowMs: number | undefined
  ) {
    const token = await create(name, days, scopes, windowMs)
    setRevealedToken(token)
    setShowCreate(false)
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section>
      <header className="mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* <KeyIcon size={18} /> */}
            <h2 className="heading-section">Access Tokens</h2>
          </div>
          <Button
            onClick={() => setShowCreate(true)}
            variant="outline"
            icon={<PlusIcon size={14} />}
          >
            Create Token
          </Button>
        </div>

        <p className="mt-1 font-text text-sm text-zinc-500 dark:text-zinc-400">
          Tokens grant read access to your data via the API. Use them to connect
          AI assistants, scripts, or other tools.
        </p>
      </header>

      {revealedToken && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-sm font-medium text-green-800 dark:text-green-300">
            Token created. Copy it now — it won&apos;t be shown again.
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
        <CreationForm
          onCreate={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
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
                onRevoke={() => revoke(token.id)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
