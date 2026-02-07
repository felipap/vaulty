import { useState, useEffect } from 'react'
import { McpServerConfig, McpServerStatus } from '../../electron'

export function McpServerTab() {
  const [config, setConfig] = useState<McpServerConfig | null>(null)
  const [status, setStatus] = useState<McpServerStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [mcpConfig, mcpStatus] = await Promise.all([
        window.electron.getMcpServerConfig(),
        window.electron.getMcpServerStatus(),
      ])
      setConfig(mcpConfig)
      setStatus(mcpStatus)
      setIsLoading(false)
    }
    load()

    // Poll status
    const interval = setInterval(async () => {
      const mcpStatus = await window.electron.getMcpServerStatus()
      setStatus(mcpStatus)
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const handleEnabledChange = async (enabled: boolean) => {
    if (!config) {
      return
    }
    setConfig({ ...config, enabled })
    await window.electron.setMcpServerConfig({ enabled })
    const newStatus = await window.electron.getMcpServerStatus()
    setStatus(newStatus)
  }

  const handlePortChange = async (port: number) => {
    if (!config) {
      return
    }
    setConfig({ ...config, port })
    await window.electron.setMcpServerConfig({ port })
  }

  if (isLoading || !config || !status) {
    return (
      <div className="flex items-center justify-center py-12 text-secondary">
        Loading...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">MCP Server</h2>
        <p className="text-sm text-secondary mb-4">
          Enable the local MCP server to allow AI assistants like Claude (in
          Cursor) to access your contacts and messages.
        </p>
      </div>

      <div className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => handleEnabledChange(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm">Enable MCP Server</span>
        </label>

        <div>
          <label className="block text-sm font-medium mb-1.5">Port</label>
          <input
            type="number"
            value={config.port}
            onChange={(e) => handlePortChange(parseInt(e.target.value, 10))}
            className="w-32 px-3 py-2 rounded-md border bg-input focus:outline-none focus:ring-2 focus:ring-blue-500"
            min={1024}
            max={65535}
          />
          <p className="text-xs text-secondary mt-1">
            Port changes take effect after restart
          </p>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold mb-2">Status</h3>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${status.running ? 'bg-green-500' : 'bg-gray-400'}`}
          />
          <span className="text-sm">
            {status.running ? `Running on port ${status.port}` : 'Not running'}
          </span>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold mb-2">Cursor Configuration</h3>
        <p className="text-sm text-secondary mb-3">
          Add this to your Cursor MCP settings to connect:
        </p>
        <pre className="text-xs bg-input p-3 rounded-md overflow-x-auto">
          {`{
  "mcpServers": {
    "contexter": {
      "url": "http://127.0.0.1:${config.port}/sse"
    }
  }
}`}
        </pre>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold mb-2">Available Tools</h3>
        <ul className="text-sm text-secondary space-y-1">
          <li>
            <strong>get_contacts</strong> - Search and list macOS contacts
          </li>
          <li>
            <strong>get_recent_imessages</strong> - Get messages from the last N
            days
          </li>
          <li>
            <strong>search_imessages</strong> - Search messages by text content
          </li>
        </ul>
      </div>
    </div>
  )
}
