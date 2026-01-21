import { useState, useEffect, useRef } from 'react'
import { BackfillProgress } from '../../../../electron'
import { Button } from '../../../../shared/ui/Button'

const DEFAULT_BACKFILL_DAYS = 50

function formatElapsedTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

export function HistoricalBackfill() {
  const [progress, setProgress] = useState<BackfillProgress | null>(null)
  const [days, setDays] = useState(DEFAULT_BACKFILL_DAYS)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)

  const isRunning = progress?.status === 'running'
  const isLoading = isRunning && progress?.phase === 'loading'
  const isUploading = isRunning && progress?.phase === 'uploading'
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

  // Elapsed time timer
  useEffect(() => {
    if (isRunning) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now()
        setElapsedSeconds(0)
      }

      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000))
        }
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      startTimeRef.current = null
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isRunning])

  const handleStart = async () => {
    setProgress({ current: 0, total: days, status: 'running' })
    window.electron.startIMessageBackfill(days)
  }

  const handleCancel = () => {
    window.electron.cancelIMessageBackfill()
  }

  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0

  const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value) && value > 0) {
      setDays(value)
    }
  }

  return (
    <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3 space-y-3">
      <div className="flex items-start gap-2">
        <HistoryIcon />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Historical Backfill
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            Import historical messages. This may take a while for large date
            ranges.
          </p>
        </div>
      </div>

      {!isRunning && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-blue-700 dark:text-blue-300">
            Days to import:
          </label>
          <input
            type="number"
            min="1"
            max="365"
            value={days}
            onChange={handleDaysChange}
            className="w-20 px-2 py-1 text-xs border border-blue-300 dark:border-blue-700 rounded bg-white dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
          />
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300">
            <div className="flex items-center gap-2">
              <LoadingSpinner />
              <span>Loading messages from iMessage into memory...</span>
            </div>
            <ElapsedTime seconds={elapsedSeconds} />
          </div>
          <div className="h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 dark:bg-blue-400 animate-pulse w-full" />
          </div>
        </div>
      )}

      {isUploading && progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300">
            <span>
              Uploading {progress.messageCount?.toLocaleString()} messages...
            </span>
            <div className="flex items-center gap-3">
              <ElapsedTime seconds={elapsedSeconds} />
              <span>{progressPercent}%</span>
            </div>
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
          <Button variant="danger" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={handleStart}>
            {isIdle ? 'Start Backfill' : 'Run Again'}
          </Button>
        )}
      </div>
    </div>
  )
}

function HistoryIcon() {
  return (
    <svg
      className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0"
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

function LoadingSpinner() {
  return (
    <svg
      className="w-3 h-3 animate-spin text-blue-600 dark:text-blue-400"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

function ElapsedTime({ seconds }: { seconds: number }) {
  return (
    <span className="text-blue-600 dark:text-blue-400 font-mono">
      {formatElapsedTime(seconds)}
    </span>
  )
}
