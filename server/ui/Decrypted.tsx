"use client"

import { getEncryptionKey, isEncrypted, maybeDecrypt } from "@/lib/encryption"
import { useEffect, useState } from "react"
import { LockIcon, AlertTriangleIcon } from "./icons"

interface Props {
  children: string | null
  showLockIcon?: boolean
}

export function Decrypted({ children, showLockIcon }: Props) {
  const [state, setState] = useState<{
    decrypted: string | null
    failed: boolean
  }>({ decrypted: null, failed: false })
  const wasEncrypted = children ? isEncrypted(children) : false

  useEffect(() => {
    let stale = false
    async function load() {
      const result = await maybeDecrypt(children)
      if (stale) {
        return
      }
      if (result) {
        setState({ decrypted: result, failed: false })
      } else if (wasEncrypted && getEncryptionKey()) {
        setState({ decrypted: null, failed: true })
        console.warn("Decryption failed for encrypted field")
      } else {
        setState({ decrypted: null, failed: false })
      }
    }
    load()
    return () => {
      stale = true
    }
  }, [children, wasEncrypted])

  const { decrypted, failed } = state

  if (failed) {
    return (
      <span className="flex items-center gap-2 text-sm italic text-red-500">
        <AlertTriangleIcon size={14} />
        Decryption failed
      </span>
    )
  }

  if (decrypted) {
    if (showLockIcon && wasEncrypted) {
      return (
        <span className="flex items-center gap-2 text-sm text-contrast">
          <span className="text-green-500" title="Decrypted">
            <LockIcon size={14} />
          </span>
          {decrypted}
        </span>
      )
    }
    return <>{decrypted}</>
  }

  if (wasEncrypted) {
    return (
      <span className="flex items-center gap-2 text-sm italic text-amber-500">
        <LockIcon size={14} />
        Encrypted - enter key to decrypt
      </span>
    )
  }

  if (showLockIcon) {
    return <span className="text-sm italic text-secondary">No content</span>
  }

  return null
}
