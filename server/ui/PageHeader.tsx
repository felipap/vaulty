type Props = {
  title: string
  subtitle?: React.ReactNode
  children?: React.ReactNode
}

export function PageHeader({ title, subtitle, children }: Props) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="heading-page">{title}</h1>
        {subtitle}
      </div>
      {children && (
        <div className="flex items-center gap-4">{children}</div>
      )}
    </div>
  )
}

export function PageCount({
  total,
  filtered,
}: {
  total: number
  filtered?: boolean
}) {
  return (
    <span className="shrink-0 text-sm text-secondary">
      {total.toLocaleString()} {filtered ? "matching" : "total"}
    </span>
  )
}

export function EmptyState({ message }: { message: string }) {
  return <p className="text-secondary">{message}</p>
}

export function LoadingState() {
  return <p className="text-secondary">Loading...</p>
}
