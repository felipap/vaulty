import { useState } from 'react'

type Props = {
  ignoredChatIds: string[]
  onAdd: (id: string) => void
  onRemove: (id: string) => void
}

export function IgnoredChatIds({ ignoredChatIds, onAdd, onRemove }: Props) {
  const [newIgnoredId, setNewIgnoredId] = useState('')

  const handleAdd = () => {
    if (!newIgnoredId.trim()) {
      return
    }
    onAdd(newIgnoredId.trim())
    setNewIgnoredId('')
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        Ignored chat IDs
      </label>
      <p className="text-xs text-secondary mb-2">
        Messages from these chats will not be synced. Enter the chat JID (e.g.,
        123456789@g.us).
      </p>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={newIgnoredId}
          onChange={(e) => setNewIgnoredId(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleAdd()
            }
          }}
          placeholder="Group ID (e.g., 123456789@g.us)"
          className="flex-1 px-3 py-2 rounded-md border bg-three focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <button
          onClick={handleAdd}
          disabled={!newIgnoredId.trim()}
          className="px-3 py-2 rounded-md bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>
      {ignoredChatIds.length > 0 && (
        <div className="space-y-1">
          {ignoredChatIds.map((id) => (
            <div
              key={id}
              className="flex items-center justify-between px-3 py-2 rounded-md bg-two text-sm"
            >
              <span className="font-mono text-xs truncate">{id}</span>
              <button
                onClick={() => onRemove(id)}
                className="ml-2 text-red-500 hover:text-red-600 text-xs font-medium"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
