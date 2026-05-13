import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        default:
          'bg-accent text-white shadow-sm hover:opacity-90 active:opacity-80',
        secondary:
          'bg-raised border border-line text-ink hover:bg-hover active:bg-selected',
        ghost:
          'text-ink-2 hover:bg-hover hover:text-ink active:bg-selected',
        destructive:
          'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-sm',
        outline:
          'border border-line bg-transparent text-ink-2 hover:bg-hover hover:text-ink active:bg-selected',
        link:
          'text-accent underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        default: 'h-8 px-3.5 py-2 text-[13px]',
        sm:      'h-7 px-2.5 text-[11px] rounded-md',
        lg:      'h-10 px-5 text-[14px]',
        icon:    'h-7 w-7 p-0 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
