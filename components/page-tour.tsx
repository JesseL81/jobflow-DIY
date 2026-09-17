"use client"

import { useEffect, useState, useCallback } from "react"

interface PageTourProps {
  steps: any[] 
  tourKey: string 
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

  useEffect(() => {
    if (typeof window === "undefined") return
    const handleRestart = () => startTour()
    window.addEventListener(`restart-tour-${tourKey}`, handleRestart)
    return () => window.removeEventListener(`restart-tour-${tourKey}`, handleRestart)
  }, [tourKey, startTour])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && currentStep !== -1) {
        endTour()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentStep, endTour])

  const updatePosition = useCallback(() => {
    if (currentStep >= 0 && currentStep < steps.length && typeof window !== "undefined") {
      setWindowDimensions({ width: window.innerWidth, height: window.innerHeight })
      const el = document.querySelector(steps[currentStep].target)
      
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        setTargetRect(el.getBoundingClientRect())

        let frameId: number
        const trackScroll = () => {
          setTargetRect(el.getBoundingClientRect())
          frameId = requestAnimationFrame(trackScroll)
        }
        frameId = requestAnimationFrame(trackScroll)
        
        setTimeout(() => cancelAnimationFrame(frameId), 500)
      } else {
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

  const p = 12
  const top = targetRect.top - p
  const left = targetRect.left - p
  const width = targetRect.width + p * 2
  const height = targetRect.height + p * 2

  // 🔥 Mobile Check
  const isMobile = windowDimensions.width < 768

  const tooltipWidth = 320
  const estimatedTooltipHeight = 180 

  const spaceAbove = top
  const spaceBelow = windowDimensions.height - (top + height)
  const spaceRight = windowDimensions.width - (left + width)
  const spaceLeft = left

  let tooltipTop = 0
  let tooltipLeft = 0

  // 🔥 Only calculate complex spatial placement on Desktop
  if (!isMobile) {
    if (height > windowDimensions.height * 0.45 && spaceRight > tooltipWidth + 32) {
      tooltipLeft = left + width + 16
      tooltipTop = top + 32 
    } else if (height > windowDimensions.height * 0.45 && spaceLeft > tooltipWidth + 32) {
      tooltipLeft = left - tooltipWidth - 16
      tooltipTop = top + 32
    } else if (spaceBelow >= estimatedTooltipHeight + 16 || spaceBelow > spaceAbove) {
      tooltipTop = top + height + 16
      tooltipLeft = left + (width / 2) - (tooltipWidth / 2)
    } else {
      tooltipTop = top - estimatedTooltipHeight - 16
      tooltipLeft = left + (width / 2) - (tooltipWidth / 2)
    }

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
  }

  return (
    <div className="fixed inset-0 z-[99999] pointer-events-none">
      
      <div
        className="absolute rounded-xl transition-all duration-300 ease-out pointer-events-auto shadow-[0_0_0_9999px_rgba(15,23,42,0.85)]"
        style={{
          top: `${top}px`,
          left: `${left}px`,
          width: `${width}px`,
          height: `${height}px`,
        }}
      />

      <div
        className="absolute bg-white rounded-xl shadow-2xl p-5 border border-slate-200 pointer-events-auto transition-all duration-300 ease-out flex flex-col justify-between"
        style={
          isMobile 
            ? { // 🔥 Mobile Override: Safely docked to the bottom center
                bottom: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'calc(100vw - 32px)',
                maxWidth: '360px',
                zIndex: 999999,
              }
            : { // Desktop Placement
                top: `${tooltipTop}px`,
                left: `${tooltipLeft}px`,
                width: `${tooltipWidth}px`,
                minHeight: '160px'
              }
        }
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