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
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      <div
        ref={drawerRef}
        className="relative w-full max-w-lg bg-white shadow-2xl dark:bg-[#0a0a0a]"
        style={{
          animation: "slideIn 0.15s ease-out",
        }}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {title}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
          >
            <CloseIcon size={16} />
          </button>
        </div>
        <div className="h-[calc(100vh-57px)] overflow-auto p-6">{children}</div>
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
