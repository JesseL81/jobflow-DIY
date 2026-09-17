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

  // 3. Track Target Element Position & Smooth Scroll
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

  // Smart Tooltip Positioning (Keeps it on the screen)
  const tooltipWidth = 320
  const tooltipHeight = 160 
  
  let tooltipTop = top + height + 16
  // Flip above element if it falls off the bottom of the screen
  if (tooltipTop + tooltipHeight > windowDimensions.height) {
    tooltipTop = top - tooltipHeight - 16
  }

  // Center horizontally, but cap it so it doesn't fall off the sides
  let tooltipLeft = left + (width / 2) - (tooltipWidth / 2)
  if (tooltipLeft < 16) tooltipLeft = 16
  if (tooltipLeft + tooltipWidth > windowDimensions.width - 16) {
    tooltipLeft = windowDimensions.width - tooltipWidth - 16
  }

  return (
    <div className="fixed inset-0 z-[99999] pointer-events-none">
      
      {/* THE SPOTLIGHT: Uses a massive box-shadow to black out the rest of the screen */}
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
        className="absolute bg-white rounded-xl shadow-2xl p-5 border border-slate-200 pointer-events-auto transition-all duration-300 ease-out"
        style={{
          top: `${tooltipTop}px`,
          left: `${tooltipLeft}px`,
          width: `${tooltipWidth}px`,
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold text-white bg-orange-500 px-2 py-0.5 rounded uppercase tracking-wider shadow-sm">
            Step {currentStep + 1} of {steps.length}
          </span>
        </div>
        
        <p className="text-sm text-slate-700 font-medium leading-relaxed mb-6">
          {step.content}
        </p>
        
        <div className="flex items-center justify-between">
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