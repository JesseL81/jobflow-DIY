"use client"

import { useEffect, useState, useCallback } from "react"

interface PageTourProps {
  steps: any[] // Accepts the exact same step format you already put in your pages
  tourKey: string // e.g., "dashboard_tour" or "selections_tour"
}

export function PageTour({ steps, tourKey }: PageTourProps) {
  const [currentStep, setCurrentStep] = useState<number>(-1)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [windowDimensions, setWindowDimensions] = useState({ width: 0, height: 0 })

  const startTour = useCallback(() => {
    setCurrentStep(0)
  }, [])

  const endTour = useCallback(() => {
    setCurrentStep(-1)
    if (typeof window !== "undefined") {
      localStorage.setItem(`cleanbuild_tour_${tourKey}`, "true")
    }
  }, [tourKey])

  // 1. Safe Client-Side Mount & LocalStorage Check
  useEffect(() => {
    if (typeof window !== "undefined") {
      setWindowDimensions({ width: window.innerWidth, height: window.innerHeight })
      const hasSeenTour = localStorage.getItem(`cleanbuild_tour_${tourKey}`)
      if (!hasSeenTour) {
        const timer = setTimeout(() => startTour(), 800)
        return () => clearTimeout(timer)
      }
    }
  }, [tourKey, startTour])

  // 2. Listen for the Replay Button
  useEffect(() => {
    if (typeof window === "undefined") return
    const handleRestart = () => startTour()
    window.addEventListener(`restart-tour-${tourKey}`, handleRestart)
    return () => window.removeEventListener(`restart-tour-${tourKey}`, handleRestart)
  }, [tourKey, startTour])

  // 3. Escape Key Failsafe
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && currentStep !== -1) {
        endTour()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentStep, endTour])

  // 4. Track Target Element Position & Smooth Scroll
  const updatePosition = useCallback(() => {
    if (currentStep >= 0 && currentStep < steps.length && typeof window !== "undefined") {
      setWindowDimensions({ width: window.innerWidth, height: window.innerHeight })
      const el = document.querySelector(steps[currentStep].target)
      
      if (el) {
        // Smooth scroll to the element
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        
        // Grab initial coordinates
        setTargetRect(el.getBoundingClientRect())

        // Track the animation frames to keep the spotlight perfectly attached during scroll
        let frameId: number
        const trackScroll = () => {
          setTargetRect(el.getBoundingClientRect())
          frameId = requestAnimationFrame(trackScroll)
        }
        frameId = requestAnimationFrame(trackScroll)
        
        // Stop tracking after the scroll animation finishes (~500ms)
        setTimeout(() => cancelAnimationFrame(frameId), 500)
      } else {
         // Gracefully skip to next step if the target isn't on the screen yet
         if (currentStep + 1 < steps.length) {
            setCurrentStep(prev => prev + 1)
         } else {
            endTour()
         }
      }
    }
  }, [currentStep, steps, endTour])

  useEffect(() => {
    updatePosition()
    if (typeof window !== "undefined") {
      window.addEventListener('resize', updatePosition)
      return () => window.removeEventListener('resize', updatePosition)
    }
  }, [updatePosition])

  if (currentStep === -1 || !targetRect) return null

  const step = steps[currentStep]
  const isLast = currentStep === steps.length - 1

  // Spotlight Padding & Math
  const p = 12
  const top = targetRect.top - p
  const left = targetRect.left - p
  const width = targetRect.width + p * 2
  const height = targetRect.height + p * 2

  // Tooltip Settings
  const tooltipWidth = 320
  const estimatedTooltipHeight = 180 

  // Available Screen Space calculations
  const spaceAbove = top
  const spaceBelow = windowDimensions.height - (top + height)
  const spaceRight = windowDimensions.width - (left + width)
  const spaceLeft = left

  let tooltipTop = 0
  let tooltipLeft = 0

  // 🔥 SMART PLACEMENT LOGIC
  if (height > windowDimensions.height * 0.45 && spaceRight > tooltipWidth + 32) {
    // 1. Target is tall (like a sidebar) and there is space on the right: Pin Right
    tooltipLeft = left + width + 16
    tooltipTop = top + 32 
  } else if (height > windowDimensions.height * 0.45 && spaceLeft > tooltipWidth + 32) {
    // 2. Target is tall and there is space on the left: Pin Left
    tooltipLeft = left - tooltipWidth - 16
    tooltipTop = top + 32
  } else if (spaceBelow >= estimatedTooltipHeight + 16 || spaceBelow > spaceAbove) {
    // 3. Default behavior: Pin Below (Centered Horizontally)
    tooltipTop = top + height + 16
    tooltipLeft = left + (width / 2) - (tooltipWidth / 2)
  } else {
    // 4. Not enough room below: Pin Above (Centered Horizontally)
    tooltipTop = top - estimatedTooltipHeight - 16
    tooltipLeft = left + (width / 2) - (tooltipWidth / 2)
  }

  // 🔥 THE FAILSAFE: Hard clamp so it never leaves the browser window
  if (tooltipTop < 16) {
    tooltipTop = 16
  } else if (tooltipTop > windowDimensions.height - estimatedTooltipHeight - 16) {
    tooltipTop = windowDimensions.height - estimatedTooltipHeight - 16
  }

  if (tooltipLeft < 16) {
    tooltipLeft = 16
  } else if (tooltipLeft + tooltipWidth > windowDimensions.width - 16) {
    tooltipLeft = windowDimensions.width - tooltipWidth - 16
  }

  return (
    <div className="fixed inset-0 z-[99999] pointer-events-none">
      
      {/* THE SPOTLIGHT */}
      <div
        className="absolute rounded-xl transition-all duration-300 ease-out pointer-events-auto shadow-[0_0_0_9999px_rgba(15,23,42,0.85)]"
        style={{
          top: `${top}px`,
          left: `${left}px`,
          width: `${width}px`,
          height: `${height}px`,
        }}
      />

      {/* THE TOOLTIP */}
      <div
        className="absolute bg-white rounded-xl shadow-2xl p-5 border border-slate-200 pointer-events-auto transition-all duration-300 ease-out flex flex-col justify-between"
        style={{
          top: `${tooltipTop}px`,
          left: `${tooltipLeft}px`,
          width: `${tooltipWidth}px`,
          minHeight: '160px'
        }}
      >
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold text-white bg-orange-500 px-2 py-0.5 rounded uppercase tracking-wider shadow-sm">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          
          <p className="text-sm text-slate-700 font-medium leading-relaxed mb-6">
            {step.content}
          </p>
        </div>
        
        <div className="flex items-center justify-between mt-auto pt-2">
          <button
            onClick={endTour}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Skip Tour
          </button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={() => {
                if (isLast) endTour()
                else setCurrentStep(prev => prev + 1)
              }}
              className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded-md shadow-sm transition-colors"
            >
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}