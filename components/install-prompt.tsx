"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

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
          <h3 className="font-bold text-sm text-white">📱 Install CleanBuild!!</h3>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Install this app to your home screen to enable offline mode and push notifications.
          </p>
        </div>

       {isIOS ? (
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700 text-xs text-slate-300 space-y-1.5">
            <div>1: Tap the <span className="font-bold text-blue-400">...</span> on the bottom right of the screen.</div>
            <div>2: Tap the <span className="font-bold text-blue-400">Share</span> icon (box with the up arrow).</div>
            <div>3: Scroll down and tap <span className="font-bold text-white">"Add to Home Screen"</span>.</div>
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