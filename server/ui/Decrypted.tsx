"use client"

import { getEncryptionKey, isEncrypted, maybeDecrypt } from "@/lib/encryption"
import { useEffect, useState } from "react"
import { LockIcon, AlertTriangleIcon } from "./icons"

interface Props {
  children: string | null
  showLockIcon?: boolean
}

export function Decrypted({ children, showLockIcon }: Props) {
  const [decrypted, setDecrypted] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const wasEncrypted = children ? isEncrypted(children) : false

  useEffect(() => {
    setDecrypted(null)
    setFailed(false)
    async function load() {
      const result = await maybeDecrypt(children)
      if (result) {
        setDecrypted(result)
      } else if (wasEncrypted && getEncryptionKey()) {
        setFailed(true)
        console.warn("Decryption failed for encrypted field")
      }
    }
    load()
  }, [children, wasEncrypted])

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
        <span className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
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
    return <span className="text-sm italic text-zinc-400">No content</span>
  }

  return null
}
