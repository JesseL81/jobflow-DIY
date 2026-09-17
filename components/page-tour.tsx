"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

/// 🔥 The ultimate hammer: Bypassing the Next.js loader type check completely
const Joyride = dynamic(() => import("react-joyride") as any, { ssr: false }) as any

interface PageTourProps {
  steps: any[] 
  tourKey: string // e.g., "dashboard_tour" or "selections_tour"
}

export function PageTour({ steps, tourKey }: PageTourProps) {
  const [run, setRun] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // 1. Mount safely to avoid hydration errors
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 2. Check if they have seen it before
  useEffect(() => {
    if (isMounted) {
      const hasSeenTour = localStorage.getItem(`cleanbuild_tour_${tourKey}`)
      if (!hasSeenTour) {
        // Slight delay so the page can fully render before the spotlight appears
        setTimeout(() => setRun(true), 800)
      }
    }
  }, [isMounted, tourKey])

  // 3. Listen for our custom "Restart" button
  useEffect(() => {
    const handleRestart = () => setRun(true)
    window.addEventListener(`restart-tour-${tourKey}`, handleRestart)
    return () => window.removeEventListener(`restart-tour-${tourKey}`, handleRestart)
  }, [tourKey])

  const handleJoyrideCallback = (data: any) => {
    const { status } = data
    
    // "finished" and "skipped" are the standard strings used by react-joyride
    if (["finished", "skipped"].includes(status)) {
      setRun(false)
      // Save to local storage so it doesn't pop up every single time they log in
      localStorage.setItem(`cleanbuild_tour_${tourKey}`, "true")
    }
  }

  if (!isMounted) return null

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={true}
      showProgress={true}
      showSkipButton={true}
      disableOverlayClose={true}
      spotlightPadding={8}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#ea580c', // CleanBuild Orange
          textColor: '#0f172a',    // Slate-900
          zIndex: 10000,
        },
        tooltipContainer: {
          textAlign: 'left'
        },
        buttonBack: {
          color: '#64748b' // Slate-500
        }
      } as any} // Bypass strict style typing
    />
  )
}