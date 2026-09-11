"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { syncManager } from "@/lib/syncManager"
import { supabase } from "@/lib/supabase"

const navItems = [
  { label: "Dashboard", href: "/", icon: "📊" },
  { label: "Schedule & Tasks", href: "/schedule", icon: "📅" },
  { label: "Punch List & To-Do's", href: "/punch-list", icon: "✅" },
  { label: "Vision Board", href: "/vision-board", icon: "📷" },
  { label: "Expenses", href: "/expenses", icon: "💰" },
  { label: "Selections", href: "/selections", icon: "🛍️" },
  { label: "Contacts & Vendors", href: "/contacts", icon: "📞" },
  { label: "Templates", href: "/templates", icon: "📋" },
  { label: "Tips & Tricks", href: "/tips", icon: "💡" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
  { label: "Logo Showcase", href: "/logo-preview", icon: "🎨" },
]

// Map the specific routes to their database permission keys
const routeToPermissionKey: Record<string, string> = {
  "/schedule": "schedule",
  "/punch-list": "punch_list",
  "/vision-board": "vision_board",
  "/expenses": "expenses",
  "/selections": "selections",
  "/contacts": "contacts",
}

// Integrated CleanBuild Logo - Transparent Background
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

export default function SidebarNav() {
  const pathname = usePathname()
  
  // Project Name State
  const [projectName, setProjectName] = useState("My Project")
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState("")

  // 🔥 NEW: Collaboration & Permissions State
  const [permissions, setPermissions] = useState<Record<string, string> | null>(null)
  const [isGuest, setIsGuest] = useState(false)
  const [isNavLoading, setIsNavLoading] = useState(true)

  // 1. Fetch Project Name
  useEffect(() => {
    const savedName = localStorage.getItem("cleanbuild_project_name")
    if (savedName) setProjectName(savedName)

    const verifyCloudName = async () => {
      try {
        const cloudName = await syncManager.pullFromCloud("cleanbuild_project_name")
        if (cloudName && typeof cloudName === "string" && cloudName !== savedName) {
          setProjectName(cloudName)
          localStorage.setItem("cleanbuild_project_name", cloudName)
          window.dispatchEvent(new Event("project-name-updated"))
        }
      } catch (e) {
        console.error("Failed to verify project name with cloud:", e)
      }
    }
    verifyCloudName()
  }, [])

  // 2. 🔥 NEW: Fetch Permissions on Load
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.email) return

        // Check if Owner
        const { data: project } = await supabase
          .from("projects")
          .select("id")
          .eq("owner_id", user.id)
          .single()

        if (project) {
          setIsGuest(false)
        } else {
          // Check if Guest
          const { data: guestInvite } = await supabase
            .from("project_members")
            .select("permissions")
            .eq("invite_email", user.email)
            .single()

          if (guestInvite) {
            setIsGuest(true)
            if (guestInvite.permissions) {
              setPermissions(guestInvite.permissions)
            }
          }
        }
      } catch (error) {
        console.error("Failed to load navigation permissions:", error)
      } finally {
        setIsNavLoading(false)
      }
    }
    fetchPermissions()
  }, [])

  const handleSaveProjectName = async () => {
    const finalName = tempName.trim() || "My Project"
    setProjectName(finalName)
    localStorage.setItem("cleanbuild_project_name", finalName)
    
    try {
      await syncManager.pushToCloud("cleanbuild_project_name", finalName)
    } catch (e) {}

    window.dispatchEvent(new Event("project-name-updated"))
    setIsEditingName(false)
  }

  // 🔥 NEW: Dynamically filter links before rendering
  const visibleNavItems = navItems.filter((item) => {
    if (!isGuest) return true // Owners see all links
    if (!permissions) return true // Fallback just in case
    
    const permKey = routeToPermissionKey[item.href]
    if (!permKey) return true // Pages without specific toggles (Dashboard, Settings) are always visible
    
    return permissions[permKey] !== "hidden"
  })

  return (
    <div className="w-full flex flex-col h-full">
      {/* Brand Header */}
      <div className="px-4 pt-2 pb-5 flex flex-col gap-4 shrink-0">
        
        {/* Top Row: Logo & Name perfectly inline */}
        <div className="flex items-center gap-3">
          <LogoCBBlock className="h-10 w-10 shrink-0 drop-shadow-md" />
          <h1 className="text-2xl font-extrabold tracking-tight text-white leading-none">
            Clean<span className="text-orange-400">Build</span>
          </h1>
        </div>
        
        {/* Bottom Row: Editable Project Name */}
        <div className="flex items-center group h-7 mt-2">
          {isEditingName ? (
            <input
              autoFocus
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveProjectName()}
              onBlur={handleSaveProjectName}
              className="text-base bg-slate-800 text-white border border-slate-600 rounded px-2 py-1 w-full outline-none focus:border-orange-400 font-bold"
              placeholder="Project Name..."
            />
          ) : (
            <>
              <span className="text-base font-bold text-slate-200 truncate max-w-[160px]" title={projectName}>
                {projectName}
              </span>
              <button 
                onClick={() => { setTempName(projectName); setIsEditingName(true); }}
                className="opacity-0 group-hover:opacity-100 ml-2 text-sm text-slate-500 hover:text-orange-400 transition-opacity"
                title="Edit Project Name"
              >
                ✏️
              </button>
            </>
          )}
        </div>
      </div>

      {/* Explicit, Foolproof Bold Orange Line */}
      <div className="mx-4 mb-4 h-[3px] bg-orange-500 rounded-full shrink-0" />

      {/* Navigation Links */}
      <nav className="space-y-1.5 text-sm font-medium px-2 flex-1 overflow-y-auto pb-4">
        {isNavLoading ? (
          // Brief skeleton loader to prevent links from flashing on screen
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-400"></div>
          </div>
        ) : (
          visibleNavItems.map((item) => {
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? "bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/30 shadow-xs"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })
        )}
      </nav>

      {/* Version Tracker at the Bottom */}
      <div className="mt-auto px-4 pb-2 pt-2 text-center shrink-0 border-t border-slate-800/80">
        <span className="text-[11px] font-bold text-slate-600 tracking-widest uppercase">
          CleanBuild v1.00
        </span>
      </div>
    </div>
  )
}