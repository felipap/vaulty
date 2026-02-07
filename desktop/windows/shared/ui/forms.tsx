import { LabelHTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'

type Props = LabelHTMLAttributes<HTMLLabelElement>

export function Label({ className, ...props }: Props) {
  return (
    <label
      className={twMerge('block text-md track-10 mb-1.5', className)}
      {...props}
    />
  )
}
