import { useState } from 'react'

type Props = {
  recipients: string[]
  onAdd: (recipient: string) => void
  onRemove: (recipient: string) => void
}

export function AllowedRecipients({ recipients, onAdd, onRemove }: Props) {
  const [newRecipient, setNewRecipient] = useState('')

  const handleAdd = () => {
    if (!newRecipient.trim()) {
      return
    }
    onAdd(newRecipient.trim())
    setNewRecipient('')
  }

  const allowAll = recipients.includes('*')

  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        Allowed recipients
      </label>
      <p className="text-xs text-tertiary mb-2">
        Only these phone numbers or emails can receive messages. Use * to allow
        all recipients. If empty, sending is blocked.
      </p>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={newRecipient}
          onChange={(e) => setNewRecipient(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleAdd()
            }
          }}
          placeholder="+1234567890 or email@example.com"
          className="flex-1 px-3 py-2 rounded-md border bg-input focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <button
          onClick={handleAdd}
          disabled={!newRecipient.trim()}
          className="px-3 py-2 rounded-md bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>
      {allowAll && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
          Wildcard (*) is set — messages can be sent to any recipient.
        </p>
      )}
      {recipients.length > 0 && (
        <div className="space-y-1">
          {recipients.map((r) => (
            <div
              key={r}
              className="flex items-center justify-between px-3 py-2 rounded-md bg-two text-sm"
            >
              <span className="font-mono text-xs truncate">{r}</span>
              <button
                onClick={() => onRemove(r)}
                className="ml-2 text-red-500 hover:text-red-600 text-xs font-medium"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      {recipients.length === 0 && (
        <p className="text-xs text-tertiary italic">
          No recipients configured — message sending is disabled.
        </p>
      )}
    </div>
  )
}
