"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

// Apple iOS Share Icon
function ShareIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
      <polyline points="16 6 12 2 8 6"/>
      <line x1="12" y1="2" x2="12" y2="15"/>
    </svg>
  )
}

// Apple iOS Add to Home Screen Icon
function AddHomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="4" width="16" height="16" rx="3" ry="3"/>
      <line x1="12" y1="9" x2="12" y2="15"/>
      <line x1="9" y1="12" x2="15" y2="12"/>
    </svg>
  )
}

export function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // 1. Check if already installed (running in standalone mode)
    const isAppMode = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone
    setIsStandalone(isAppMode)

    if (isAppMode) return

    // 2. Check if the user manually dismissed the banner before
    const dismissed = localStorage.getItem("cleanbuild_dismissed_install")
    if (dismissed) {
      setIsDismissed(true)
      return
    }

    // 3. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIOSDevice)

    // 4. Capture native install prompt for Android / Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem("cleanbuild_dismissed_install", "true")
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === "accepted") {
        setDeferredPrompt(null)
      }
    }
  }

  // Hide if already installed, dismissed, or not on a mobile browser
  if (isStandalone || isDismissed || (!isIOS && !deferredPrompt)) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:w-96">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 text-white flex flex-col gap-3 relative overflow-hidden">
        
        <button 
          onClick={handleDismiss}
          className="absolute top-2 right-2 h-6 w-6 flex items-center justify-center text-slate-400 hover:text-white bg-slate-800 rounded-full text-xs"
        >
          ✕
        </button>

        <div className="pr-6">
          <h3 className="font-bold text-sm text-white">📱 Install CleanBuild</h3>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            <div>*** Safari only ***</div>
            <div>Install this app to your home screen to enable offline mode and push notifications.</div>
          </p>
        </div>

        {isIOS ? (
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700 text-xs text-slate-300 space-y-2">
            <div className="flex items-start gap-1.5">
              <span className="font-bold text-slate-500 mt-0.5">1:</span>
              <span className="leading-relaxed">Tap the <span className="font-bold text-orange-400">...</span> on the bottom right of the screen.</span>
            </div>
            
            <div className="flex items-start gap-1.5">
              <span className="font-bold text-slate-500 mt-0.5">2:</span>
              <span className="leading-relaxed flex flex-wrap items-center gap-x-1.5">
                Tap the <span className="font-bold text-orange-400">Share</span> icon 
                <span className="bg-slate-700 text-blue-400 p-1 rounded shadow-sm inline-flex"><ShareIcon className="h-3.5 w-3.5" /></span>
              </span>
            </div>
            
            <div className="flex items-start gap-1.5">
              <span className="font-bold text-slate-500 mt-0.5">3:</span>
              <span className="leading-relaxed flex flex-wrap items-center gap-x-1.5">
                Scroll down and tap <span className="font-bold text-orange-400">Add to Home Screen</span> 
                <span className="bg-slate-700 text-white p-1 rounded shadow-sm inline-flex"><AddHomeIcon className="h-3.5 w-3.5" /></span>
              </span>
            </div>
          </div>
        ) : (
          <Button 
            onClick={handleInstallClick}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 text-xs"
          >
            Add to Home Screen
          </Button>
        )}
      </div>
    </div>
  )
}