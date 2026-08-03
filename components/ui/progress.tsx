"use client"

import { Progress as ProgressPrimitive } from "@base-ui/react/progress"
import { cn } from "@/lib/utils"

function Progress({
  className,
  children,
  value,
  ...props
}: ProgressPrimitive.Root.Props) {
  // 1. Ensure the value stays safely between 0 and 100
  const safeValue = Math.min(100, Math.max(0, value || 0))

  return (
    <ProgressPrimitive.Root
      value={safeValue}
      data-slot="progress"
      className={cn("flex flex-wrap gap-3", className)}
      {...props}
    >
      {children}
      <ProgressTrack>
        {/* 2. Added explicit inline style for width so the blue bar actually fills */}
        <ProgressIndicator style={{ width: `${safeValue}%` }} />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  )
}

function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
  return (
    <ProgressPrimitive.Track
      className={cn(
        // 3. Changed h-1 to 'h-full min-h-[6px]' so it inherits the h-3 from your dashboard
        // 4. Defaulted to bg-slate-100 for the empty track
        "relative flex h-full min-h-[6px] w-full items-center overflow-x-hidden rounded-full bg-slate-100",
        className
      )}
      data-slot="progress-track"
      {...props}
    />
  )
}

function ProgressIndicator({
  className,
  ...props
}: ProgressPrimitive.Indicator.Props) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      // 5. Hardcoded bg-blue-600 and added a smooth transition animation
      className={cn("h-full bg-blue-600 transition-all duration-500 ease-in-out", className)}
      {...props}
    />
  )
}

function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
  return (
    <ProgressPrimitive.Label
      className={cn("text-sm font-medium", className)}
      data-slot="progress-label"
      {...props}
    />
  )
}

function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      className={cn(
        "ml-auto text-sm text-muted-foreground tabular-nums",
        className
      )}
      data-slot="progress-value"
      {...props}
    />
  )
}

export {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
}