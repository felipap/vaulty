import { forwardRef, ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { twMerge } from 'tailwind-merge'

const buttonVariants = cva(
  'px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-blue-500 text-white hover:bg-blue-600',
        secondary:
          'bg-[var(--surface-hover)] hover:bg-[var(--surface-active)] border dark:border-neutral-200',
        danger:
          'border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-800/30',
      },
      size: {
        default: 'px-4 py-2',
        sm: 'px-3 py-1.5 text-sm',
        lg: 'px-6 py-3 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={twMerge(buttonVariants({ variant, size }), className)}
        {...props}
      />
    )
  },
)

Button.displayName = 'Button'
