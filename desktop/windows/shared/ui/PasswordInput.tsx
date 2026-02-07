import { useState } from 'react'
import { EyeIcon, EyeOffIcon, DiceIcon } from './icons'
import { twMerge } from 'tailwind-merge'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder: string
  hasError?: boolean
  onGenerate?: () => void
}

export function PasswordInput({
  value,
  onChange,
  placeholder,
  hasError,
  onGenerate,
}: Props) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="flex gap-2 items-center">
      <div className="relative flex-1">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={twMerge(
            'text-md w-full px-3 py-2 pr-10 rounded-md border bg-three focus:outline-none focus:ring-2 focus:ring-blue-500',
            hasError ? 'border-red-500' : '',
          )}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-secondary hover:text-contrast transition-colors"
        >
          {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
        </button>
      </div>
      {onGenerate && (
        <button
          type="button"
          onClick={onGenerate}
          className="flex items-center gap-1 px-2.5 py-2 rounded-md border text-sm text-secondary hover:text-contrast hover:bg-(--surface-hover) transition-colors shrink-0"
          title="Generate a random value"
        >
          <DiceIcon size={15} />
          <span>Generate</span>
        </button>
      )}
    </div>
  )
}
