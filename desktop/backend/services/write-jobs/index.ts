import { apiRequest } from '../../lib/contexter-api'
import { createLogger } from '../../lib/logger'
import { getDeviceId } from '../../store'
import type { Service } from '../index'
import { imessageSendHandler } from './imessage-send'

const log = createLogger('write-jobs')

export type JobResult = { success: true } | { error: string }

export type JobHandler = {
  execute(payload: Record<string, unknown>): Promise<JobResult>
}

const handlers: Record<string, JobHandler> = {
  imessage_send: imessageSendHandler,
}

type WriteJob = {
  id: string
  type: string
  status: string
  payload: Record<string, unknown>
  createdAt: string
}

type ClaimResponse = {
  job: WriteJob | null
  hasMore: boolean
}

async function claimNextJob(): Promise<ClaimResponse> {
  const result = await apiRequest<ClaimResponse>({
    path: '/api/write/jobs/pending',
    method: 'POST',
  })

  if ('error' in result) {
    throw new Error(`Failed to claim job: ${result.error}`)
  }

  return result.data
}

async function markJobComplete(
  jobId: string,
  success: boolean,
  error?: string,
): Promise<void> {
  const deviceId = getDeviceId()
  const result = await apiRequest({
    path: `/api/write/jobs/${jobId}/complete`,
    method: 'POST',
    body: { success, error, deviceId },
  })

  if ('error' in result) {
    log.error(`Failed to mark job ${jobId} as complete: ${result.error}`)
  }
}

async function executeJob(job: WriteJob): Promise<void> {
  log.info(`Executing job ${job.id} (${job.type})`)

  const handler = handlers[job.type]
  if (!handler) {
    log.warn(`Unknown job type: ${job.type}`)
    await markJobComplete(job.id, false, `Unknown job type: ${job.type}`)
    return
  }

  const result = await handler.execute(job.payload)
  await markJobComplete(
    job.id,
    'error' in result ? false : true,
    'error' in result ? result.error : undefined,
  )
}

async function poll(): Promise<void> {
  log.info('Polling for write jobs')

  for (;;) {
    let claim: ClaimResponse
    try {
      claim = await claimNextJob()
    } catch (error) {
      log.error('Failed to claim job:', error)
      return
    }

    if (!claim.job) {
      return
    }

    log.info(`Executing job ${claim.job.id} (${claim.job.type})`)
    try {
      await executeJob(claim.job)
    } catch (error) {
      log.error('Execute job failed:', error)
      await markJobComplete(claim.job.id, false, `Execute job failed: ${error}`)
    }

    if (!claim.hasMore) {
      return
    }
  }
}

let timeout: NodeJS.Timeout | null = null
let running = false

function scheduleNext(): void {
  timeout = setTimeout(async () => {
    await poll()
    if (running) {
      scheduleNext()
    }
  }, 5_000)
}

export const readJobsService: Service = {
  name: 'write-jobs',
  async start() {
    if (running) {
      return
    }
    running = true
    log.info('Starting...')
    await poll()
    scheduleNext()
  },
  stop() {
    running = false
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  },
  restart() {
    this.stop()
    this.start()
  },
  isRunning: () => running,
  isEnabled: () => true,
  async runNow() {
    log.info('Running now')
    await poll()
  },
  getNextRunTime: () => null,
  getTimeUntilNextRun: () => 0,
  getLastSyncStatus: () => null,
  getLastFailedSyncId: () => null,
}
