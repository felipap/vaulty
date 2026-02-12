"use client"

import { Button } from "@/ui/Button"
import {
  ContactIcon,
  IMessageIcon,
  LayoutDashboardIcon,
  MapPinIcon,
  ScreenshotIcon,
  SettingsIcon,
  StickyNoteIcon,
  WhatsappIcon,
} from "@/ui/icons"
import { type Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { type ReactNode } from "react"
import { twMerge } from "tailwind-merge"
import { logout } from "../actions"
import { EncryptionKeyButton } from "./EncryptionKeyButton"
import { ThemeToggle } from "./ThemeToggle"

const NAV_ITEMS: Array<{
  href: string
  label: string
  icon: ReactNode
}> = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: <LayoutDashboardIcon size={13} />,
  },
  {
    href: "/dashboard/screenshots",
    label: "Screenshots",
    icon: <ScreenshotIcon size={14} />,
  },
  {
    href: "/dashboard/imessages",
    label: "iMessages",
    icon: <IMessageIcon size={13} />,
  },
  {
    href: "/dashboard/whatsapp",
    label: "WhatsApp",
    icon: <WhatsappIcon size={13} />,
  },
  {
    href: "/dashboard/icontacts",
    label: "Apple Contacts",
    icon: <ContactIcon size={13} />,
  },
  {
    href: "/dashboard/locations",
    label: "Locations",
    icon: <MapPinIcon size={13} />,
  },
  {
    href: "/dashboard/stickies",
    label: "Stickies",
    icon: <StickyNoteIcon size={11} />,
  },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#0a0a0a]">
      <div className="mx-auto  px-5">
        <div className="flex items-center justify-between py-5">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-lg font-semibold tracking-tight"
            >
              Vaulty
            </Link>
            <span className="font-mono text-sm text-neutral-400 dark:text-neutral-500">
              v{process.env.APP_VERSION}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" icon={<SettingsIcon size={14} />}>
              Settings
            </Button>
            <EncryptionKeyButton />
            <form action={logout}>
              <Button type="submit" variant="outline">
                Sign Out
              </Button>
            </form>
          </div>
        </div>
        <nav className="-mb-px flex gap-1.5 lg:-ml-2">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href as Route}
                className={twMerge(
                  "flex  items-center gap-1.5 track-20 rounded-sm px-2 py-1 text-[13px] transition-colors mb-2",
                  isActive
                    ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-300"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
