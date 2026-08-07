"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import SidebarNav from "@/components/sidebar-nav"
import { supabase } from "@/lib/supabase"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname === "/login"
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      // Check if the user is currently logged into Supabase
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session && pathname !== "/login") {
        // If they have no session and aren't on the login page, kick them to login
        router.push("/login")
      } else {
        // Otherwise, let them through
        setIsCheckingAuth(false)
      }
    }
    
    checkUser()

    // Listen for logouts so we can instantly kick them to the login screen if they sign out
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session && pathname !== "/login") {
        router.push("/login")
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [pathname, router])

  // Prevent a brief flash of the dashboard while we check their login status
  if (isCheckingAuth && !isLoginPage) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-sm font-medium">
        Loading CleanBuild...
      </div>
    )
  }

  // If the user is on the login page, render ONLY the page content (No Sidebar)
  if (isLoginPage) {
    return (
      <div className="flex-1 min-h-screen bg-slate-900 flex flex-col">
        {children}
      </div>
    )
  }

  // For all other pages, render the Sidebar and the standard grey content area
  return (
    <div className="flex min-h-screen w-full">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 shrink-0">
        <SidebarNav />
      </aside>
      
      <div className="flex-1 bg-slate-100 text-slate-900 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}