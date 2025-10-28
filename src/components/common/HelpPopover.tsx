"use client"

import React from "react"
import { HelpCircle } from "lucide-react"
import * as HoverCard from "@radix-ui/react-hover-card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type HelpPopoverProps = {
  text?: string
  children?: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  className?: string
  iconClassName?: string
  openOnHoverDelay?: number
  closeDelay?: number
  ariaLabel?: string
  trigger?: "hover" | "click"
  icon?: React.ReactNode
}

/**
 * HelpPopover — shared component
 * - Hover mode (default): Radix HoverCard with open/close delays; stable icon color (no flash on leave).
 * - Click mode: uses shared UI Popover for accessible click-to-open behavior.
 * - Content can be plain `text` or rich `children`.
 */
export default function HelpPopover({
  text,
  children,
  side = "top",
  align = "center",
  className,
  iconClassName,
  openOnHoverDelay = 120,
  closeDelay = 320,
  ariaLabel = "Help",
  trigger = "hover",
  icon,
}: HelpPopoverProps) {
  const defaultIcon = <HelpCircle className={cn("h-4 w-4", iconClassName)} aria-hidden="true" />
  const iconEl = React.isValidElement(icon)
    ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
        className: cn(
          "h-4 w-4",
          iconClassName,
          (icon as React.ReactElement<{ className?: string }>).props.className
        ),
      })
    : (icon ?? defaultIcon)

  if (trigger === "click") {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            className={cn(
              "inline-flex items-center rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              className
            )}
          >
            {iconEl}
          </button>
        </PopoverTrigger>
        <PopoverContent align={align} className={cn("z-50 w-72 rounded-md border p-2 shadow-md outline-none max-w-xs text-sm leading-relaxed")}>
          {children ? children : <p className="p-1">{text}</p>}
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <HoverCard.Root openDelay={openOnHoverDelay} closeDelay={closeDelay}>
      <HoverCard.Trigger asChild>
        <span
          role="button"
          tabIndex={0}
          aria-label={ariaLabel}
          className={cn(
            "inline-flex cursor-help items-center rounded p-1 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className
          )}
        >
          {iconEl}
        </span>
      </HoverCard.Trigger>

      <HoverCard.Portal>
        <HoverCard.Content
          side={side}
          align={align}
          sideOffset={4}
          className={cn(
            "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
            "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            "z-50 w-72 rounded-md border p-2 shadow-md outline-none max-w-xs text-sm leading-relaxed"
          )}
        >
          {children ? children : <p className="p-1">{text}</p>}
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  )
}