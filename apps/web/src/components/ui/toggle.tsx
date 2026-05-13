'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface ToggleProps {
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  className?: string
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ value, onChange, disabled, className }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={value}
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          value ? 'bg-accent' : 'bg-[var(--c-line)]',
          'h-5 w-9',
          className
        )}
      >
        <span
          className={cn(
            'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200',
            value ? 'translate-x-4' : 'translate-x-0'
          )}
        />
      </button>
    )
  }
)
Toggle.displayName = 'Toggle'

export { Toggle }
