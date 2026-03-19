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
    <div className="flex items-center gap-2 text-sm max-w-[200px]">
      <span className="text-secondary">Sort by</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded border border-zinc-200 bg-white py-1 pl-2 pr-7 text-sm text-contrast dark:border-zinc-700 dark:bg-zinc-900"
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
