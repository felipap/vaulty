"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { logout } from "./actions"
import { twMerge } from "tailwind-merge"

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/screenshots", label: "Screenshots" },
  { href: "/dashboard/messages", label: "Messages" },
  { href: "/dashboard/chats", label: "Chats" },
  { href: "/dashboard/contacts", label: "Contacts" },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex items-center justify-between py-4">
          <Link href="/dashboard" className="text-xl font-semibold">
            Context
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Sign Out
            </button>
          </form>
        </div>
        <nav className="-mb-px flex gap-6">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={twMerge(
                  "border-b-2 pb-3 text-sm font-medium transition-colors",
                  isActive
                    ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-300"
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
