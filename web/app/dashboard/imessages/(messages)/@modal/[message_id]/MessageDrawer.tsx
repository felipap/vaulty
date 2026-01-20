"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { CloseIcon, LockIcon, FileIcon, ImageIcon, DownloadIcon } from "@/ui/icons"
import { decryptText, decryptBinaryToBase64, isEncrypted, getEncryptionKey } from "@/lib/encryption"
import { type MessageWithAttachments, type Attachment } from "../../actions"

type Props = {
  message: MessageWithAttachments
}

type DecryptedAttachment = Attachment & {
  decryptedDataBase64: string | null
}

export function MessageDrawer({ message }: Props) {
  const router = useRouter()
  const drawerRef = useRef<HTMLDivElement>(null)
  const [decryptedText, setDecryptedText] = useState<string | null>(null)
  const [decryptedAttachments, setDecryptedAttachments] = useState<DecryptedAttachment[]>([])

  useEffect(() => {
    async function decrypt() {
      if (!message.text || !isEncrypted(message.text)) {
        setDecryptedText(message.text)
        return
      }
      const key = getEncryptionKey()
      if (!key) {
        setDecryptedText(null)
        return
      }
      const decrypted = await decryptText(message.text, key)
      setDecryptedText(decrypted)
    }
    decrypt()
  }, [message.text])

  useEffect(() => {
    async function decryptAttachments() {
      const key = getEncryptionKey()
      const decrypted = await Promise.all(
        message.attachments.map(async (attachment) => {
          if (!attachment.dataBase64) {
            return { ...attachment, decryptedDataBase64: null }
          }
          if (!isEncrypted(attachment.dataBase64)) {
            return { ...attachment, decryptedDataBase64: attachment.dataBase64 }
          }
          if (!key) {
            return { ...attachment, decryptedDataBase64: null }
          }
          // Use decryptBinaryToBase64 for attachments since they contain binary data
          const decryptedData = await decryptBinaryToBase64(attachment.dataBase64, key)
          return { ...attachment, decryptedDataBase64: decryptedData }
        })
      )
      setDecryptedAttachments(decrypted)
    }
    decryptAttachments()
  }, [message.attachments])

  const handleClose = () => {
    router.back()
  }

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose()
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        handleClose()
      }
    }

    document.addEventListener("keydown", handleEscape)
    document.addEventListener("mousedown", handleClickOutside)
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.removeEventListener("mousedown", handleClickOutside)
      document.body.style.overflow = ""
    }
  }, [])

  const displayData = {
    ...message,
    decryptedText,
    isTextEncrypted: message.text ? isEncrypted(message.text) : false,
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        ref={drawerRef}
        className="relative w-full max-w-lg animate-slide-in bg-white shadow-2xl dark:bg-zinc-900"
        style={{
          animation: "slideIn 0.2s ease-out",
        }}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Message Details
          </h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <CloseIcon size={20} />
          </button>
        </div>
        <div className="h-[calc(100vh-73px)] overflow-auto p-6">
          <div className="space-y-4">
            <InfoRow label="Contact" value={message.contact} />
            <InfoRow
              label="Direction"
              value={message.isFromMe ? "Sent" : "Received"}
            />
            <InfoRow label="Service" value={message.service} />
            <InfoRow
              label="Date"
              value={message.date ? new Date(message.date).toLocaleString() : "—"}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-500">
                Message
              </label>
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950">
                {decryptedText ? (
                  <p className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                    {displayData.isTextEncrypted && (
                      <span className="text-green-500" title="Decrypted">
                        <LockIcon size={14} />
                      </span>
                    )}
                    {decryptedText}
                  </p>
                ) : displayData.isTextEncrypted ? (
                  <p className="flex items-center gap-2 text-sm italic text-amber-500">
                    <LockIcon size={14} />
                    Encrypted - enter key to decrypt
                  </p>
                ) : (
                  <p className="text-sm italic text-zinc-400">
                    {message.hasAttachments ? "📎 Attachment" : "No content"}
                  </p>
                )}
              </div>
            </div>
            {message.attachments.length > 0 && (
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-500">
                  Attachments ({message.attachments.length})
                </label>
                <div className="space-y-3">
                  {decryptedAttachments.map((attachment) => (
                    <AttachmentCard key={attachment.id} attachment={attachment} />
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <label className="mb-2 block text-sm font-medium text-zinc-500">
              Raw JSON
            </label>
            <pre className="whitespace-pre-wrap break-all rounded-lg bg-zinc-50 p-4 font-mono text-sm text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
              {JSON.stringify(displayData, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-zinc-500">
        {label}
      </label>
      <p className="text-sm text-zinc-800 dark:text-zinc-200">{value}</p>
    </div>
  )
}

function AttachmentCard({ attachment }: { attachment: DecryptedAttachment }) {
  const isEncryptedAttachment = attachment.dataBase64 && isEncrypted(attachment.dataBase64)
  const hasData = !!attachment.decryptedDataBase64

  const handleDownload = () => {
    if (!attachment.decryptedDataBase64) {
      return
    }
    const link = document.createElement("a")
    link.href = `data:${attachment.mimeType};base64,${attachment.decryptedDataBase64}`
    link.download = attachment.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatSize = (bytes: number | null) => {
    if (bytes === null) {
      return "Unknown size"
    }
    if (bytes < 1024) {
      return `${bytes} B`
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (attachment.isImage && hasData) {
    return (
      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="relative">
          <Image
            src={`data:${attachment.mimeType};base64,${attachment.decryptedDataBase64}`}
            alt={attachment.filename}
            width={400}
            height={256}
            className="max-h-64 w-full object-contain bg-zinc-100 dark:bg-zinc-900"
            unoptimized
          />
          {isEncryptedAttachment && (
            <span
              className="absolute top-2 right-2 text-green-500 bg-white/80 dark:bg-black/80 rounded-full p-1"
              title="Decrypted"
            >
              <LockIcon size={12} />
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-2 min-w-0">
            <ImageIcon size={16} className="shrink-0 text-zinc-500" />
            <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">
              {attachment.filename}
            </span>
            <span className="shrink-0 text-xs text-zinc-400">
              {formatSize(attachment.size)}
            </span>
          </div>
          <button
            onClick={handleDownload}
            className="shrink-0 rounded p-1.5 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            title="Download"
          >
            <DownloadIcon size={16} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0 rounded-lg bg-zinc-200 p-2 dark:bg-zinc-800">
          {attachment.isImage ? (
            <ImageIcon size={18} className="text-zinc-600 dark:text-zinc-400" />
          ) : (
            <FileIcon size={18} className="text-zinc-600 dark:text-zinc-400" />
          )}
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {isEncryptedAttachment && hasData && (
              <span className="text-green-500" title="Decrypted">
                <LockIcon size={12} />
              </span>
            )}
            {attachment.filename}
          </p>
          <p className="text-xs text-zinc-500">
            {attachment.mimeType} • {formatSize(attachment.size)}
          </p>
        </div>
      </div>
      {hasData ? (
        <button
          onClick={handleDownload}
          className="shrink-0 rounded p-1.5 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          title="Download"
        >
          <DownloadIcon size={16} />
        </button>
      ) : isEncryptedAttachment ? (
        <span className="shrink-0 text-xs text-amber-500 flex items-center gap-1">
          <LockIcon size={12} />
          Encrypted
        </span>
      ) : (
        <span className="shrink-0 text-xs text-zinc-400">No data</span>
      )}
    </div>
  )
}
