type Option<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  value: T
  onChange: (value: T) => void
  options: Option<T>[]
}

export function SortSelector<T extends string>({
  value,
  onChange,
  options,
}: Props<T>) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-zinc-500">Sort by:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
