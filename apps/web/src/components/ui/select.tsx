import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          'flex h-9 w-full rounded-lg border border-line bg-raised px-3.5 py-2 text-sm text-ink transition-colors appearance-none',
          'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20',
          'disabled:opacity-50 disabled:bg-hover disabled:cursor-not-allowed',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    )
  }
)
Select.displayName = 'Select'

export { Select }
