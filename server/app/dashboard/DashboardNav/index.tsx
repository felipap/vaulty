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
        <div className="flex items-center justify-between py-4">
          <div className="flex items-end gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-lg font-semibold"
            >
              <Logo className="w-6 h-6" />
              {/* Vaulty */}
            </Link>
            <span className="font-mono text-sm text-tertiary">
              v{process.env.APP_VERSION}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" icon={<SettingsIcon size={14} />}>
              <Link href="/dashboard/settings">Settings</Link>
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
                    ? "bg-neutral-100 text-contrast dark:bg-neutral-800"
                    : "text-secondary hover:bg-neutral-50 hover:text-contrast dark:hover:bg-neutral-900"
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

function Logo({ className }: { className?: string }) {
  return (
    <svg
      width="50"
      height="50"
      viewBox="0 0 126 126"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        opacity="0.9"
        x="3.5"
        y="3.5"
        width="118.066"
        height="118.066"
        rx="26.5"
        stroke="currentColor"
        stroke-width="7"
      />
      <circle cx="91.6924" cy="91.6866" r="7.53226" fill="currentColor" />
      <circle cx="33.3877" cy="91.6866" r="7.53226" fill="currentColor" />
      <circle cx="91.6924" cy="33.3799" r="7.53226" fill="currentColor" />
      <circle cx="33.3877" cy="33.3799" r="7.53226" fill="currentColor" />
      <line
        opacity="0.5"
        x1="33.3829"
        y1="91.2239"
        x2="50.7366"
        y2="73.8705"
        stroke="currentColor"
        stroke-width="10"
        stroke-linecap="round"
      />
      <line
        opacity="0.5"
        x1="74.3047"
        y1="50.302"
        x2="88.085"
        y2="36.5217"
        stroke="currentColor"
        stroke-width="10"
        stroke-linecap="round"
      />
      <line
        opacity="0.5"
        x1="74.1605"
        y1="73.9332"
        x2="89.7855"
        y2="89.5582"
        stroke="currentColor"
        stroke-width="10"
      />
      <line
        opacity="0.5"
        x1="33.4613"
        y1="33.234"
        x2="52.5539"
        y2="52.3262"
        stroke="currentColor"
        stroke-width="10"
      />
      <circle
        cx="62.543"
        cy="62.5332"
        r="12.4688"
        stroke="currentColor"
        stroke-width="12"
      />
    </svg>
  )
}
