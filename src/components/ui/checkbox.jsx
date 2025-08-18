import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
  const handleClick = () => {
    if (!disabled && onCheckedChange) {
      onCheckedChange(!checked)
    }
  }

  const handleKeyDown = (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !disabled && onCheckedChange) {
      e.preventDefault()
      onCheckedChange(!checked)
    }
  }

  return (
    <div
      ref={ref}
      role="checkbox"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer transition-colors",
        checked ? "bg-primary text-primary-foreground" : "bg-background",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {checked && (
        <div className="flex items-center justify-center text-current">
          <Check className="h-4 w-4" />
        </div>
      )}
    </div>
  )
})

Checkbox.displayName = "Checkbox"

export { Checkbox }

