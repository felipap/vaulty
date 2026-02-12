import { twMerge } from "tailwind-merge"

type Props = {
  name?: string
  id?: string
  isGroup?: boolean
  size?: "sm" | "md" | "lg"
}

const avatarColors = [
  "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
  "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
  "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
  "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
  "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
]

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
}

function hashColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

export function ContactAvatar({ name, id, isGroup, size = "sm" }: Props) {
  const initial = isGroup ? "G" : name ? name.charAt(0).toUpperCase() : null

  const colorClass = id
    ? hashColor(id)
    : isGroup
      ? "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
      : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"

  return (
    <div
      className={twMerge(
        "flex shrink-0 items-center justify-center rounded-full font-medium",
        sizeClasses[size],
        colorClass
      )}
    >
      {initial}
    </div>
  )
}
