"use client"

import { useEffect, useState } from "react"
import { createToken, getAccessTokens, revokeToken } from "../actions"

export type TokenInfo = {
  id: string
  name: string
  tokenPrefix: string
  expiresAt: string | null
  lastUsedAt: string | null
  createdAt: string
}

export function useAccessTokens() {
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTokens()
  }, [])

  async function loadTokens() {
    setLoading(true)
    const result = await getAccessTokens()
    setTokens(result)
    setLoading(false)
  }

  async function create(name: string, expiresInDays?: number) {
    const result = await createToken(name, expiresInDays)
    await loadTokens()
    return result.token
  }

  async function revoke(id: string) {
    await revokeToken(id)
    await loadTokens()
  }

  return { tokens, loading, create, revoke }
}
