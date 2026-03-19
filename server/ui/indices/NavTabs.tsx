"use client"

import { type Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/ui/Button"

type Tab = {
  href: string
  label: string
}

type Props = {
  tabs: readonly Tab[]
  rootHref: string
}

export function NavTabs({ tabs, rootHref }: Props) {
  const pathname = usePathname()

  return (
    <div className="mb-6 flex gap-2 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive =
          tab.href === rootHref
            ? pathname === rootHref
            : pathname.startsWith(tab.href)

        return (
          <Button
            key={tab.href}
            asChild
            variant={isActive ? "default" : "secondary"}
            className="text-nowrap"
          >
            <Link
              href={tab.href as Route}
              className="text-nowrap whitespace-nowrap"
            >
              {tab.label}
            </Link>
          </Button>
        )
      })}
    </div>
  )
}
