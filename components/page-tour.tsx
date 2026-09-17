"use client"

import { useEffect, useState } from "react"

// 🔥 DITCHING next/dynamic COMPLETELY. 
// We import it normally, tell TypeScript to ignore the outdated type warning, 
// and use our 'isMounted' state to make it safe for Next.js rendering.
// @ts-ignore
import Joyride from "react-joyride"

interface PageTourProps {
  steps: any[] 
  tourKey: string // e.g., "dashboard_tour" or "selections_tour"
}

export function PageTour({ steps, tourKey }: PageTourProps) {
  const [run, setRun] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // 1. Mount safely to avoid hydration errors on the server
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
      localStorage.setItem(`cleanbuild_tour_${tourKey}`, "true")
    }
  }

  // 🔥 This single line perfectly replaces the need for `next/dynamic`.
  // It forces Next.js to wait until the browser loads to render the tour.
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
      }}
    />
  )
}