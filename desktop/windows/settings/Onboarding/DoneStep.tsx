import { Button } from '../../shared/ui/Button'

type Props = {
  onFinish: () => void
}

export function DoneStep({ onFinish }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="mb-6">
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-green-500"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      </div>

      <h2 className="text-2xl font-semibold mb-3">You're all set!</h2>

      <p className="text-secondary text-sm leading-relaxed max-w-md mb-2">
        Vaulty is now connected to your server. You can enable data sources from
        the settings panel.
      </p>

      <p className="text-secondary text-sm leading-relaxed max-w-md mb-8">
        Look for the Vaulty icon in your menu bar &mdash; it will always be
        there, keeping things in sync.
      </p>

      <Button variant="primary" onClick={onFinish}>
        Open Settings
      </Button>
    </div>
  )
}
