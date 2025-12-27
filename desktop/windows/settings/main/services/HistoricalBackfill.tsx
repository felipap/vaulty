import { useState, useEffect, useRef } from 'react'
import { BackfillProgress } from '../../../electron'

const BACKFILL_DAYS = 120

export function HistoricalBackfill() {
  const [progress, setProgress] = useState<BackfillProgress | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  const isRunning = progress?.status === 'running'
  const isIdle = !progress || progress.status === 'idle'
  const isCompleted = progress?.status === 'completed'
  const isError = progress?.status === 'error'
  const isCancelled = progress?.status === 'cancelled'

  useEffect(() => {
    // Initial fetch
    window.electron.getIMessageBackfillProgress().then(setProgress)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (isRunning && !pollingRef.current) {
      pollingRef.current = setInterval(async () => {
        const p = await window.electron.getIMessageBackfillProgress()
        setProgress(p)
        if (p.status !== 'running' && pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
      }, 500)
    }

    return () => {
      if (!isRunning && pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [isRunning])

  const handleStart = async () => {
    setProgress({ current: 0, total: BACKFILL_DAYS, status: 'running' })
    window.electron.startIMessageBackfill(BACKFILL_DAYS)
  }

  const handleCancel = () => {
    window.electron.cancelIMessageBackfill()
  }

  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0

  return (
    <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3 space-y-3">
      <div className="flex items-start gap-2">
        <HistoryIcon />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Historical Backfill
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            Import your last {BACKFILL_DAYS} days of messages. This may take a
            while.
          </p>
        </div>
      </div>

      {isRunning && progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300">
            <span>
              Day {progress.current} of {progress.total}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {isCompleted && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckIcon />
          <span>Backfill completed successfully!</span>
        </div>
      )}

      {isCancelled && (
        <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
          <span>Backfill was cancelled</span>
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <span>Error: {progress?.error || 'Unknown error'}</span>
        </div>
      )}

      <div className="flex gap-2">
        {isRunning ? (
          <button
            onClick={handleCancel}
            className="text-xs px-3 py-1.5 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-800/30 rounded-md transition-colors"
          >
            Cancel
          </button>
        ) : (
          <button
            onClick={handleStart}
            className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            {isIdle ? 'Start Backfill' : 'Run Again'}
          </button>
        )}
      </div>
    </div>
  )
}

function HistoryIcon() {
  return (
    <svg
      className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 text-green-600 dark:text-green-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}


