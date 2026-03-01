import { IMessageSDK } from '@photon-ai/imessage-kit'
import { createLogger } from '../../lib/logger'
import { createIMessageSDK } from '../../sources/imessage'
import { store } from '../../store'
import type { JobHandler } from './index'

const log = createLogger('imessage-send')

let sdk: IMessageSDK | null = null

function getSDK(): IMessageSDK {
  if (!sdk) {
    sdk = createIMessageSDK()
  }
  return sdk
}

function isRecipientAllowed(recipient: string): boolean {
  const { allowedRecipients } = store.get('writeJobs')

  if (!allowedRecipients || allowedRecipients.length === 0) {
    return false
  }

  if (allowedRecipients.includes('*')) {
    return true
  }

  return allowedRecipients.some(
    (r) => r.toLowerCase() === recipient.toLowerCase(),
  )
}

export const imessageSendHandler: JobHandler = {
  async execute(payload) {
    const { recipient, message } = payload as {
      recipient: string
      message: string
    }

    if (!isRecipientAllowed(recipient)) {
      log.warn(`Blocked iMessage to "${recipient}" — not in allowedRecipients`)
      return {
        error: `Recipient "${recipient}" is not in the desktop allowed recipients list`,
      }
    }

    log.info(`Sending iMessage to ${recipient}`)

    try {
      await getSDK().send(recipient, message)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log.error(`Failed to send iMessage: ${msg}`)
      return { error: msg }
    }

    log.info(`iMessage sent to ${recipient}`)
    return { success: true }
  },
}
