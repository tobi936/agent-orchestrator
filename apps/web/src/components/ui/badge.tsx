import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium font-mono transition-colors',
  {
    variants: {
      variant: {
        default:     'bg-hover text-ink-3',
        running:     'bg-green-bg text-green-fg',
        pending:     'bg-orange-bg text-orange-fg',
        active:      'bg-accent-bg text-accent-fg',
        done:        'bg-green-bg text-green-fg',
        destructive: 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400',
        amber:       'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
