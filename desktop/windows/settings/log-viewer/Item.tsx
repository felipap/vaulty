import { forwardRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { SyncLog, SyncLogSource } from '../../electron'

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

const SOURCE_LABELS: Record<SyncLogSource, string> = {
  screenshots: 'Screenshots',
  imessage: 'iMessage',
  contacts: 'Contacts',
  'whatsapp-sqlite': 'WhatsApp (SQLite)',
  'whatsapp-unipile': 'WhatsApp (Unipile)',
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

type Props = {
  log: SyncLog
  showDate: boolean
  highlighted?: boolean
}

export const SyncLogItem = forwardRef<HTMLTableRowElement, Props>(
  function SyncLogItem({ log, showDate, highlighted }, ref) {
    const [expanded, setExpanded] = useState(highlighted ?? false)

    return (
      <>
        <tr
          ref={ref}
          onClick={() => setExpanded(!expanded)}
          className={twMerge(
            'border-b border-one hover:bg-three cursor-pointer',
            highlighted ? 'bg-blue-50 dark:bg-blue-900/20' : '',
          )}
        >
          <td className="py-2.5 font-mono text-xs">
            {showDate && (
              <span className="text-secondary mr-1.5">
                {formatDate(log.timestamp)}
              </span>
            )}
            {formatTimestamp(log.timestamp)}
          </td>
          <td className="py-2.5">{SOURCE_LABELS[log.source]}</td>
          <td className="py-2.5">
            <StatusBadge status={log.status} />
          </td>
          <td className="py-2.5 text-right font-mono text-xs text-secondary">
            {log.duration}ms
          </td>
        </tr>
        {expanded && (
          <tr className="bg-two">
            <td colSpan={4} className="px-4 py-3 text-sm">
              <div className="space-y-1">
                <div>
                  <span className="text-secondary">Source:</span>{' '}
                  {SOURCE_LABELS[log.source]}
                </div>
                <div>
                  <span className="text-secondary">Status:</span>{' '}
                  {log.status === 'success' ? 'Success' : 'Failed'}
                </div>
                <div>
                  <span className="text-secondary">Duration:</span>{' '}
                  {log.duration}ms
                </div>
                {log.errorMessage && (
                  <div>
                    <span className="text-secondary">Error:</span>{' '}
                    <span className="text-red-600 dark:text-red-400 font-mono text-xs">
                      {log.errorMessage}
                    </span>
                  </div>
                )}
              </div>
            </td>
          </tr>
        )}
      </>
    )
  },
)
