"use client"

import { useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { CloseIcon } from "./icons"

type Props = {
  title: string
  children: React.ReactNode
  onClose?: () => void
}

export function Drawer({ title, children, onClose }: Props) {
  const router = useRouter()
  const drawerRef = useRef<HTMLDivElement>(null)

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose()
    } else {
      router.back()
    }
  }, [onClose, router])

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
  }, [handleClose])

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
            {title}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <CloseIcon size={20} />
          </button>
        </div>
        <div className="h-[calc(100vh-73px)] overflow-auto p-6">{children}</div>
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
