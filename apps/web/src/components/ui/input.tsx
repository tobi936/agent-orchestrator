import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-lg border border-line bg-raised px-3.5 py-2 text-sm text-ink placeholder:text-ink-4 transition-colors',
          'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20',
          'disabled:opacity-50 disabled:bg-hover disabled:cursor-not-allowed',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
