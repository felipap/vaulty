"use client"

import { Button } from "@/ui/Button"
import { MoonIcon, SunIcon } from "@/ui/icons"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Standard hydration pattern
    setMounted(true)
    const isDarkMode = document.documentElement.classList.contains("dark")
    setIsDark(isDarkMode)
  }, [])

  const toggleTheme = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)

    if (newIsDark) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  if (!mounted) {
    return (
      <button
        className="rounded-md border border-neutral-200 p-2 dark:border-neutral-800"
        aria-label="Toggle theme"
      >
        <div className="h-[14px] w-[14px]" />
      </button>
    )
  }

  return (
    <Button
      onClick={toggleTheme}
      variant="outline"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      icon={isDark ? <SunIcon size={14} /> : <MoonIcon size={14} />}
    />
  )
}
