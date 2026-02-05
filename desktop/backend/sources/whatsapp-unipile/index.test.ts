// Test Unipile WhatsApp API
// Run with: npx tsx desktop/backend/sources/unipile/index.test.ts
//
// Required environment variables:
//   UNIPILE_API_BASE_URL (default: https://api16.unipile.com:14645)
//   UNIPILE_TOKEN
//   UNIPILE_ACCOUNT_ID

import { fetchChats, fetchChatMessages, fetchAllMessages, UnipileConfig } from './index'

const TEST_CONFIG: UnipileConfig = {
  apiBaseUrl: process.env.UNIPILE_API_BASE_URL || 'https://api16.unipile.com:14645',
  apiToken: process.env.UNIPILE_TOKEN || '',
  accountId: process.env.UNIPILE_ACCOUNT_ID || '',
}

async function testFetchChats() {
  console.log('\n=== Test: Fetch Chats ===')
  const chats = await fetchChats(TEST_CONFIG)
  console.log('✓ Fetched chats:', chats.length)
  if (chats.length > 0) {
    console.log('Sample chat:', JSON.stringify(chats[0], null, 2))
  }
  return chats
}

async function testFetchMessages(chatId: string) {
  console.log('\n=== Test: Fetch Messages ===')
  console.log('Chat ID:', chatId)
  const messages = await fetchChatMessages(TEST_CONFIG, chatId)
  console.log('✓ Fetched messages:', messages.length)
  if (messages.length > 0) {
    console.log('Sample message:', JSON.stringify(messages[0], null, 2))
  }
  return messages
}

async function testFetchMessagesSince(chatId: string) {
  console.log('\n=== Test: Fetch Messages Since Date ===')
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
  console.log('Since:', since.toISOString())
  const messages = await fetchChatMessages(TEST_CONFIG, chatId, since)
  console.log('✓ Fetched messages since date:', messages.length)
  return messages
}

async function testFetchAllMessages() {
  console.log('\n=== Test: Fetch All Messages ===')
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
  console.log('Since:', since.toISOString())
  const messages = await fetchAllMessages(TEST_CONFIG, since)
  console.log('✓ Total messages fetched:', messages.length)
  if (messages.length > 0) {
    console.log('First message:', JSON.stringify(messages[0], null, 2))
    console.log('Last message:', JSON.stringify(messages[messages.length - 1], null, 2))

    // Verify sorting
    let sorted = true
    for (let i = 1; i < messages.length; i++) {
      const prevTime = new Date(messages[i - 1].timestamp).getTime()
      const currTime = new Date(messages[i].timestamp).getTime()
      if (currTime < prevTime) {
        sorted = false
        break
      }
    }
    console.log('✓ Messages sorted by timestamp:', sorted)
  }
  return messages
}

async function main() {
  console.log('Testing Unipile WhatsApp API')
  console.log('============================')

  if (!TEST_CONFIG.apiToken || !TEST_CONFIG.accountId) {
    console.error('Error: Missing required environment variables.')
    console.error('Please set:')
    console.error('  UNIPILE_TOKEN - Your Unipile API token')
    console.error('  UNIPILE_ACCOUNT_ID - Your Unipile account ID')
    console.error('')
    console.error('Example:')
    console.error('  UNIPILE_TOKEN=xxx UNIPILE_ACCOUNT_ID=yyy npx tsx desktop/backend/sources/unipile/index.test.ts')
    process.exit(1)
  }

  console.log('API Base URL:', TEST_CONFIG.apiBaseUrl)
  console.log('Account ID:', TEST_CONFIG.accountId)

  try {
    const chats = await testFetchChats()

    if (chats.length > 0) {
      await testFetchMessages(chats[0].id)
      await testFetchMessagesSince(chats[0].id)
    }

    await testFetchAllMessages()

    console.log('\n============================')
    console.log('✓ All tests passed!')
  } catch (error) {
    console.error('\n✗ Test failed:', error)
    process.exit(1)
  }
}

main()
