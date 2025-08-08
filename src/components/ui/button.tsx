import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium font-poppins ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft hover:shadow-romantic transform hover:scale-105",
        romantic: "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-romantic hover:shadow-lg transform hover:scale-105 active:scale-95",
        golden: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-soft hover:shadow-romantic transform hover:scale-105",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-muted text-muted-foreground hover:bg-muted/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        floating: "bg-secondary text-secondary-foreground shadow-romantic hover:shadow-lg transform hover:scale-110 active:scale-95 rounded-full",
      },
      size: {
        default: "h-10 md:h-12 px-4 md:px-6 py-2 md:py-3",
        sm: "h-8 md:h-9 rounded-xl px-2 md:px-3 text-xs md:text-sm",
        lg: "h-12 md:h-14 rounded-2xl px-6 md:px-8 text-sm md:text-base",
        xl: "h-14 md:h-16 rounded-2xl px-8 md:px-10 text-base md:text-lg",
        icon: "h-10 w-10 md:h-12 md:w-12",
        fab: "h-12 w-12 md:h-14 md:w-14 rounded-full",
        compact: "h-8 px-3 py-1 text-xs rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
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
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
