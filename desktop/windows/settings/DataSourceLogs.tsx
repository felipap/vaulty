import { forwardRef, useEffect, useRef, useState } from 'react'
import { SyncLog } from '../electron'
import { withBoundary } from '../shared/ui/withBoundary'
import { formatDate } from './log-viewer/Item'

type Props = {
  logs: SyncLog[]
  highlightSyncId?: string | null
  sourceLabel: string
}

export const DataSourceLogs = withBoundary(function DataSourceLogs({
  logs,
  highlightSyncId,
  sourceLabel,
}: Props) {
  const highlightRef = useRef<HTMLTableRowElement>(null)

  useEffect(() => {
    if (highlightSyncId && highlightRef.current) {
      highlightRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [highlightSyncId, logs])

  return (
    <div>
      <h3 className="text-md font-medium mb-3">Recent Syncs</h3>

      {logs.length === 0 ? (
        <div className="text-sm text-secondary py-4">
          No sync attempts for {sourceLabel} yet.
        </div>
      ) : (
        <div className="overflow-auto max-h-64 border rounded-lg">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-two">
              <tr className="text-left text-secondary border-b">
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium text-right">Duration</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 20).map((log, index) => {
                const showDate =
                  index === 0 ||
                  formatDate(log.timestamp) !==
                    formatDate(logs[index - 1].timestamp)
                const isHighlighted = log.id === highlightSyncId

                return (
                  <DataSourceLogItem
                    key={log.id}
                    log={log}
                    showDate={showDate}
                    highlighted={isHighlighted}
                    ref={isHighlighted ? highlightRef : undefined}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
})

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function StatusBadge({ status }: { status: 'success' | 'error' }) {
  if (status === 'error') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
        Failed
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
      Success
    </span>
  )
}

type ItemProps = {
  log: SyncLog
  showDate: boolean
  highlighted?: boolean
}

const DataSourceLogItem = forwardRef<HTMLTableRowElement, ItemProps>(
  function DataSourceLogItem({ log, showDate, highlighted }, ref) {
    const [expanded, setExpanded] = useState(highlighted ?? false)

    return (
      <>
        <tr
          ref={ref}
          onClick={() => setExpanded(!expanded)}
          className={`border-b border-one hover:bg-input cursor-pointer ${
            highlighted ? 'bg-blue-50 dark:bg-blue-900/20' : ''
          }`}
        >
          <td className="px-3 py-2 font-mono text-xs">
            {showDate && (
              <span className="text-secondary mr-1.5">
                {formatDate(log.timestamp)}
              </span>
            )}
            {formatTimestamp(log.timestamp)}
          </td>
          <td className="px-3 py-2">
            <StatusBadge status={log.status} />
          </td>
          <td className="px-3 py-2 text-right font-mono text-xs text-secondary">
            {log.duration}ms
          </td>
        </tr>
        {expanded && log.errorMessage && (
          <tr className="bg-two">
            <td colSpan={3} className="px-3 py-2 text-sm">
              <span className="text-red-600 dark:text-red-400 font-mono text-xs">
                {log.errorMessage}
              </span>
            </td>
          </tr>
        )}
      </>
    )
  },
)
