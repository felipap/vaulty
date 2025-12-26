import { createIMessageSDK, fetchMessages } from './index'

async function main() {
  console.log('Testing iMessage export...')

  const sdk = createIMessageSDK()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000) // last 24 hours

  const messages = await fetchMessages(sdk, since)

  console.log(`✓ Fetched ${messages.length} messages`)

  if (messages.length > 0) {
    console.log('Sample message:', {
      id: messages[0].id,
      guid: messages[0].guid,
      text: messages[0].text?.slice(0, 50),
      contact: messages[0].contact,
      isFromMe: messages[0].isFromMe,
      date: messages[0].date,
      hasAttachments: messages[0].hasAttachments,
      service: messages[0].service,
    })
  }
}

main().catch((err) => {
  console.error('✗ Test failed:', err.message)
  process.exit(1)
})
