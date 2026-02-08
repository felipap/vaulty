export function formatRelative(dateString: string): string {
  const date = new Date(dateString)
  const now = Date.now()
  const diff = now - date.getTime()

  if (diff < 0) {
    // Future date
    const absDiff = Math.abs(diff)
    if (absDiff < 60_000) {
      return "in less than a minute"
    }
    if (absDiff < 3600_000) {
      return `in ${Math.floor(absDiff / 60_000)}m`
    }
    if (absDiff < 86400_000) {
      return `in ${Math.floor(absDiff / 3600_000)}h`
    }
    return `in ${Math.floor(absDiff / 86400_000)}d`
  }

  if (diff < 60_000) {
    return "just now"
  }
  if (diff < 3600_000) {
    return `${Math.floor(diff / 60_000)}m ago`
  }
  if (diff < 86400_000) {
    return `${Math.floor(diff / 3600_000)}h ago`
  }
  return `${Math.floor(diff / 86400_000)}d ago`
}
