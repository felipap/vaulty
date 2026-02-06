import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { createServer, IncomingMessage, ServerResponse } from 'http'
import { z } from 'zod'
import { createLogger } from '../lib/logger'
import { fetchContacts } from '../sources/contacts'
import { createIMessageSDK, fetchMessages } from '../sources/imessage'

const log = createLogger('mcp')

const DEFAULT_PORT = 19513

let server: ReturnType<typeof createServer> | null = null
let mcpServer: McpServer | null = null
const imessageSDK = createIMessageSDK()

function setupMcpServer(): McpServer {
  const mcp = new McpServer({
    name: 'contexter',
    version: '1.0.0',
  })

  // ============================================================================
  // Contacts Tools
  // ============================================================================

  mcp.tool(
    'get_contacts',
    'Get all contacts from macOS Contacts app',
    {
      search: z
        .string()
        .optional()
        .describe(
          'Optional search term to filter contacts by name, email, or phone',
        ),
    },
    async ({ search }) => {
      log.info('get_contacts called', { search })
      const contacts = fetchContacts()

      let filtered = contacts
      if (search) {
        const term = search.toLowerCase()
        filtered = contacts.filter((c) => {
          const name = `${c.firstName ?? ''} ${c.lastName ?? ''}`.toLowerCase()
          const emails = c.emails.join(' ').toLowerCase()
          const phones = c.phoneNumbers.join(' ').toLowerCase()
          const org = (c.organization ?? '').toLowerCase()
          return (
            name.includes(term) ||
            emails.includes(term) ||
            phones.includes(term) ||
            org.includes(term)
          )
        })
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(filtered, null, 2),
          },
        ],
      }
    },
  )

  // ============================================================================
  // iMessage Tools
  // ============================================================================

  mcp.tool(
    'get_recent_imessages',
    'Get recent iMessages from the last N days',
    {
      days: z
        .number()
        .default(7)
        .describe('Number of days to look back (default: 7)'),
      includeAttachments: z
        .boolean()
        .default(false)
        .describe(
          'Include base64 image attachments (default: false, can be large)',
        ),
    },
    async ({ days, includeAttachments }) => {
      log.info('get_recent_imessages called', { days, includeAttachments })
      const since = new Date()
      since.setDate(since.getDate() - days)

      const messages = await fetchMessages(imessageSDK, since, {
        includeAttachments,
      })

      // Group by chat for easier reading
      const byChat = new Map<string, typeof messages>()
      for (const msg of messages) {
        const chatMessages = byChat.get(msg.chatId) ?? []
        chatMessages.push(msg)
        byChat.set(msg.chatId, chatMessages)
      }

      const result = Array.from(byChat.entries()).map(([chatId, msgs]) => ({
        chatId,
        contact: msgs[0]?.contact,
        messageCount: msgs.length,
        messages: msgs.map((m) => ({
          id: m.id,
          text: m.text,
          date: m.date,
          isFromMe: m.isFromMe,
          hasAttachments: m.hasAttachments,
          attachments: includeAttachments ? m.attachments : undefined,
        })),
      }))

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      }
    },
  )

  mcp.tool(
    'search_imessages',
    'Search iMessages by text content',
    {
      query: z.string().describe('Text to search for in messages'),
      days: z
        .number()
        .default(30)
        .describe('Number of days to look back (default: 30)'),
    },
    async ({ query, days }) => {
      log.info('search_imessages called', { query, days })
      const since = new Date()
      since.setDate(since.getDate() - days)

      const messages = await fetchMessages(imessageSDK, since, {
        includeAttachments: false,
      })

      const term = query.toLowerCase()
      const matches = messages.filter(
        (m) => m.text && m.text.toLowerCase().includes(term),
      )

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              matches.map((m) => ({
                id: m.id,
                text: m.text,
                contact: m.contact,
                chatId: m.chatId,
                date: m.date,
                isFromMe: m.isFromMe,
              })),
              null,
              2,
            ),
          },
        ],
      }
    },
  )

  return mcp
}

// Track active transports for cleanup
const transports = new Map<string, SSEServerTransport>()

export function startMcpServer(port: number = DEFAULT_PORT): Promise<number> {
  return new Promise((resolve, reject) => {
    if (server) {
      log.warn('MCP server already running')
      resolve(port)
      return
    }

    mcpServer = setupMcpServer()

    server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? '/', `http://localhost:${port}`)

      // CORS headers for all responses
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

      if (req.method === 'OPTIONS') {
        res.writeHead(204)
        res.end()
        return
      }

      // Health check endpoint
      if (url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'ok' }))
        return
      }

      // SSE endpoint for MCP
      if (url.pathname === '/sse') {
        log.info('New SSE connection')
        const transport = new SSEServerTransport('/message', res)
        const sessionId = Math.random().toString(36).substring(7)
        transports.set(sessionId, transport)

        res.on('close', () => {
          log.info('SSE connection closed', { sessionId })
          transports.delete(sessionId)
        })

        if (mcpServer) {
          await mcpServer.connect(transport)
        }
        return
      }

      // Message endpoint for MCP
      if (url.pathname === '/message' && req.method === 'POST') {
        let body = ''
        req.on('data', (chunk) => {
          body += chunk.toString()
        })
        req.on('end', async () => {
          // Find the transport and send the message
          // The SSEServerTransport handles routing internally
          for (const transport of transports.values()) {
            try {
              await transport.handlePostMessage(req, res, body)
              return
            } catch {
              // Try next transport
            }
          }
          res.writeHead(404)
          res.end('No active session')
        })
        return
      }

      res.writeHead(404)
      res.end('Not found')
    })

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        log.warn(`Port ${port} in use, trying ${port + 1}`)
        server = null
        startMcpServer(port + 1)
          .then(resolve)
          .catch(reject)
      } else {
        reject(err)
      }
    })

    server.listen(port, '127.0.0.1', () => {
      log.info(`MCP server listening on http://127.0.0.1:${port}`)
      resolve(port)
    })
  })
}

export function stopMcpServer(): void {
  if (server) {
    server.close()
    server = null
    mcpServer = null
    transports.clear()
    log.info('MCP server stopped')
  }
}

export function getMcpServerPort(): number | null {
  if (!server) {
    return null
  }
  const addr = server.address()
  if (typeof addr === 'object' && addr) {
    return addr.port
  }
  return null
}
