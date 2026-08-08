"use client"

import { useEffect, useState, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import SidebarNav from "@/components/sidebar-nav"
import { supabase } from "@/lib/supabase"

// Integrated CleanBuild Logo for the Mobile Header
function LogoCBBlock({ className = "h-9 w-9", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M20 38L50 20L80 38L50 56L20 38Z" fill="#FF8C00"/>
      <path d="M20 38V68L50 85V56L20 38Z" fill="#C2410C"/>
      <path d="M80 38V68L50 85V56L80 38Z" fill="#FF6B00"/>
      <path
        d="M44 50.4L33 43.8C28.5 41.1 26 44 26 49.5V58.5C26 64 28.5 66.9 33 69.6L44 76.2"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <g stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <line x1="56" y1="52.6" x2="56" y2="75" />
        <path d="M56 52.6L68 45.4C72.5 42.7 75 44.5 75 48.5C75 52.5 72.5 55.5 68 58.2L56 65.4" />
        <path d="M56 65.4L69 57.6C73.5 54.9 76 56.7 76 60.7C76 64.7 73.5 67.7 69 70.4L56 78.2" />
      </g>
    </svg>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname === "/login"
  
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Pull-to-Refresh State
  const [pullProgress, setPullProgress] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const touchStartY = useRef(0)

  // 1. SUPABASE AUTHENTICATION CHECK
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session && pathname !== "/login") {
        router.push("/login")
      } else {
        setIsCheckingAuth(false)
      }
    }
    
    checkUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session && pathname !== "/login") {
        router.push("/login")
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [pathname, router])

  // 2. MOBILE MENU ROUTE LISTENER (Closes menu automatically when a link is clicked)
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // 3. AUTO-WAKE SYNC LISTENER (Refreshes data when app comes back on screen)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Send a signal to all active tabs to check the cloud for new data
        window.dispatchEvent(new Event("logs-updated"))
        window.dispatchEvent(new Event("expenses-updated"))
        window.dispatchEvent(new Event("project-name-updated"))
      }
    }
    
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [])

  // 4. PULL-TO-REFRESH TOUCH HANDLERS
  const handleTouchStart = (e: React.TouchEvent) => {
    // Only track pulling if we are at the absolute top of the page
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === 0) return
    const currentY = e.touches[0].clientY
    const distance = currentY - touchStartY.current

    // If pulling downwards while at the top of the page
    if (distance > 0 && window.scrollY === 0) {
      // Create a resistance effect (max out at 80px visual drop)
      setPullProgress(Math.min(distance * 0.4, 80))
    }
  }

  const handleTouchEnd = () => {
    if (pullProgress > 60) {
      setIsRefreshing(true)
      // Force a hard browser reload to dump cache and restart app
      window.location.reload()
    } else {
      setPullProgress(0)
    }
    touchStartY.current = 0
  }

  // Prevent a brief flash of the dashboard while we check their login status
  if (isCheckingAuth && !isLoginPage) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-sm font-medium">
        Loading CleanBuild...
      </div>
    )
  }

  // If the user is on the login page, render ONLY the page content (No Sidebar/Header)
  if (isLoginPage) {
    return (
      <div className="flex-1 min-h-screen bg-slate-900 flex flex-col">
        {children}
      </div>
    )
  }

  // For all other pages, render the Responsive Application Layout
  return (
    <div 
      className="flex flex-col md:flex-row min-h-screen w-full bg-slate-100 relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* PULL TO REFRESH VISUAL INDICATOR */}
      {pullProgress > 0 && (
        <div 
          className="fixed top-[-50px] left-0 w-full flex justify-center z-[100] pointer-events-none transition-transform duration-75"
          style={{ transform: `translateY(${pullProgress}px)` }}
        >
          <div className="bg-white shadow-lg border border-slate-200 rounded-full px-4 py-2 flex items-center gap-2 text-sm font-bold text-slate-700">
            {isRefreshing ? (
              <span className="animate-pulse">⏳ Refreshing...</span>
            ) : pullProgress > 60 ? (
              <span className="text-blue-600">⬇️ Release to refresh</span>
            ) : (
              <span>⬇️ Pull down</span>
            )}
          </div>
        </div>
      )}

      {/* MOBILE HEADER BAR (Visible only on small screens) */}
      <div className="md:hidden flex items-center justify-between bg-slate-900 text-white p-4 border-b border-slate-800 shrink-0 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <LogoCBBlock className="h-8 w-8 drop-shadow-md" />
          <span className="text-xl font-extrabold tracking-tight">
            Clean<span className="text-orange-400">Build</span>
          </span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-1.5 text-slate-300 hover:text-white focus:outline-none"
          title="Open Menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* MOBILE SLIDE-OUT MENU OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Dark blurred backdrop (Clicking this closes the menu) */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Sidebar Menu Panel */}
          <aside className="relative w-72 max-w-[80%] bg-slate-900 h-full flex flex-col p-4 shadow-2xl overflow-y-auto transform transition-transform">
            {/* Close Button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full z-50 shadow-md transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>
              </svg>
            </button>
            
            {/* Render the standard Sidebar inside the mobile panel */}
            <SidebarNav />
          </aside>
        </div>
      )}

      {/* DESKTOP SIDEBAR (Visible only on medium/large screens) */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 flex-col p-4 shrink-0 h-screen sticky top-0 z-30">
        <SidebarNav />
      </aside>
      
      {/* MAIN PAGE CONTENT */}
      <div className="flex-1 text-slate-900 w-full overflow-x-hidden">
        {children}
      </div>
    </div>
  )
}