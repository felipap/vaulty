import { useEffect, useRef, useState } from 'react'
import { SyncLog } from '../../electron'
import { Button } from '../../shared/ui/Button'
import { SyncLogItem, formatDate } from './Item'

type Props = {
  highlightSyncId?: string | null
}

export function LogsTab({ highlightSyncId }: Props) {
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const highlightRef = useRef<HTMLTableRowElement>(null)

  useEffect(() => {
    async function main() {
      const result = await window.electron.getSyncLogs()
      setLogs(result)
      setIsLoading(false)
    }

    main()

    const interval = setInterval(main, 2000)
    return () => {
      clearInterval(interval)
    }
  }, [])

  // Scroll to highlighted item
  useEffect(() => {
    if (highlightSyncId && highlightRef.current) {
      highlightRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [highlightSyncId, logs])

  const handleClear = async () => {
    await window.electron.clearSyncLogs()
    setLogs([])
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-tertiary">
        Loading logs...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Sync Logs</h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleClear}
          disabled={logs.length === 0}
        >
          Clear Logs
        </Button>
      </div>

      {logs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-tertiary py-12">
          <p>No sync attempts logged yet</p>
          <p className="text-sm mt-1">Sync attempts will appear here</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto -mx-4 px-4">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-one">
              <tr className="text-left text-tertiary border-b">
                <th className="pb-2 font-medium">Time</th>
                <th className="pb-2 font-medium">Source</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium text-right">Duration</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => {
                const showDate =
                  index === 0 ||
                  formatDate(log.timestamp) !==
                    formatDate(logs[index - 1].timestamp)
                const isHighlighted = log.id === highlightSyncId

                return (
                  <SyncLogItem
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
}
