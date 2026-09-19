"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { syncManager } from "@/lib/syncManager"
import { supabase } from "@/lib/supabase"
import { clear } from "idb-keyval"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useOfflineSync } from "@/hooks/useOfflineSync"

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "📊" },
  { label: "Vision Board", href: "/vision-board", icon: "📷" },
  { label: "Selections", href: "/selections", icon: "🛍️" },
  { label: "Schedule & Tasks", href: "/schedule", icon: "📅" },
  { label: "Contacts & Vendors", href: "/contacts", icon: "📞" },
  { label: "Punch List & To-Do's", href: "/punch-list", icon: "✅" },
  { label: "Expenses", href: "/expenses", icon: "💰" },
  { label: "Documents & Plans", href: "/documents", icon: "📄" },
  { label: "Tips & Tricks", href: "/tips", icon: "💡" },
  { label: "Templates", href: "/templates", icon: "📋" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
  { label: "Logo Showcase", href: "/logo-preview", icon: "🎨" },
]

const routeToPermissionKey: Record<string, string> = {
  "/schedule": "schedule",
  "/punch-list": "punch_list",
  "/vision-board": "vision_board",
  "/documents": "documents",
  "/expenses": "expenses",
  "/selections": "selections",
  "/contacts": "contacts",
}

interface ProjectWorkspace {
  id: string
  name: string
  role: "owner" | "guest"
}

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
  
  // 🔥 New Multi-Project Sync Source
  const [projectsList, setProjectsList] = useOfflineSync<ProjectWorkspace[]>("cleanbuild_projects_list", [])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>("")
  const [currentUserId, setCurrentUserId] = useState<string>("")

  const [projectName, setProjectName] = useState("My Primary Project")
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState("")

  const [permissions, setPermissions] = useState<Record<string, string> | null>(null)
  const [isGuest, setIsGuest] = useState(false)
  const [accountTier, setAccountTier] = useState<string>("free")
  const [isNavLoading, setIsNavLoading] = useState(true)
  const [isSwitching, setIsSwitching] = useState(false)
  const [restrictedModalOpen, setRestrictedModalOpen] = useState(false)

  // Listen for Dashboard project switches
  useEffect(() => {
    const handleWorkspaceChange = () => {
      const wid = localStorage.getItem("cleanbuild_active_workspace") || currentUserId
      setActiveWorkspaceId(wid)
    }
    
    window.addEventListener("workspace-changed", handleWorkspaceChange)
    handleWorkspaceChange()
    
    return () => window.removeEventListener("workspace-changed", handleWorkspaceChange)
  }, [currentUserId])

  // Sync Sidebar Name with Active Project Data
  useEffect(() => {
    if ((projectsList || []).length > 0 && activeWorkspaceId) {
      const activeProj = projectsList.find(p => p.id === activeWorkspaceId)
      if (activeProj) {
        setProjectName(activeProj.name)
        setTempName(activeProj.name)
      } else {
        setProjectName("My Primary Project")
        setTempName("My Primary Project")
      }
    }
  }, [projectsList, activeWorkspaceId])

  useEffect(() => {
    const fetchCoreData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.email) return
        setCurrentUserId(user.id)

        const { data: profile } = await supabase.from("profiles").select("tier").eq("id", user.id).maybeSingle()
        if (profile) setAccountTier(profile.tier)

        const currentWorkspaceId = localStorage.getItem("cleanbuild_active_workspace") || user.id
        setActiveWorkspaceId(currentWorkspaceId)

        if (currentWorkspaceId === user.id) {
          setIsGuest(false) 
        } else {
          setIsGuest(true) 
          const { data: guestInvite } = await supabase
            .from("project_members")
            .select("permissions")
            .eq("invite_email", user.email)
            .ilike("status", "active")
            .maybeSingle()

          if (guestInvite?.permissions) {
            setPermissions(guestInvite.permissions)
          }
        }
      } catch (error) {
        console.error("Failed to load navigation data:", error)
      } finally {
        setIsNavLoading(false)
      }
    }
    fetchCoreData()
  }, [])

  const handleSaveProjectName = async () => {
    const finalName = tempName.trim() || "My Project"
    
    const updatedList = (projectsList || []).map(p => 
      p.id === activeWorkspaceId ? { ...p, name: finalName } : p
    )
    
    // Safety fallback: if list is entirely empty, seed it
    if (updatedList.length === 0 && currentUserId) {
      updatedList.push({ id: currentUserId, name: finalName, role: "owner" })
    }
    
    await setProjectsList(updatedList)
    setProjectName(finalName)
    setIsEditingName(false)
    window.dispatchEvent(new Event("workspace-changed"))
  }

  const handleWorkspaceChange = async (newWorkspaceId: string) => {
    if (newWorkspaceId === activeWorkspaceId) return

    setIsSwitching(true)
    localStorage.setItem("cleanbuild_active_workspace", newWorkspaceId)
    window.dispatchEvent(new Event("workspace-changed"))
    window.location.href = "/dashboard"
  }

  const handleDeleteProject = async () => {
    if (!activeWorkspaceId.startsWith("proj_")) return
    
    if (!window.confirm(`🚨 Are you sure you want to permanently delete "${projectName}" and all its tasks, expenses, and photos? This cannot be undone.`)) {
      return
    }
    
    setIsSwitching(true)
    
    const updatedList = (projectsList || []).filter(p => p.id !== activeWorkspaceId)
    await setProjectsList(updatedList)
    
    const fallbackId = currentUserId || "default"
    localStorage.setItem("cleanbuild_active_workspace", fallbackId)
    setActiveWorkspaceId(fallbackId)
    
    window.dispatchEvent(new Event("workspace-changed"))
    window.location.href = "/dashboard"
  }

  const isSecondaryProject = activeWorkspaceId.startsWith("proj_")

  return (
    <div className="w-full flex flex-col h-full relative">
      
      {isSwitching && (
        <div className="absolute inset-0 bg-slate-900/80 z-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
        </div>
      )}

      <div className="px-4 pt-5 pb-4 flex flex-col gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <LogoCBBlock className="h-10 w-10 shrink-0 drop-shadow-md" />
          <h1 className="text-2xl font-extrabold tracking-tight text-white leading-none">
            Clean<span className="text-orange-400">Build</span>
          </h1>
        </div>
        
        <div className="flex items-center h-7 mt-1 w-full">
          {isEditingName && !isGuest && accountTier !== "free" ? (
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
            <div className="flex items-center gap-2 w-full group">
              {!isGuest && accountTier !== "free" && (
                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    onClick={() => { setTempName(projectName); setIsEditingName(true); }}
                    className="text-base text-slate-500 hover:text-orange-400 transition-colors"
                    title="Edit Project Name"
                  >
                    ✏️
                  </button>
                  {isSecondaryProject && (
                    <button 
                      onClick={handleDeleteProject}
                      className="text-base text-slate-500 hover:text-rose-500 transition-colors"
                      title="Delete Project"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              )}
              <span className="text-base font-bold text-slate-200 truncate ml-1" title={projectName}>
                {projectName}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Global Project Switcher Pills */}
      {(projectsList || []).length > 1 && (
        <div className="px-4 pb-4 shrink-0">
          <div className="bg-slate-900 p-1.5 rounded-lg flex items-center border border-slate-700 shadow-inner gap-1 overflow-x-auto custom-scrollbar">
            {(projectsList || []).map((w) => {
              const isActive = activeWorkspaceId === w.id
              return (
                <button
                  key={w.id}
                  onClick={() => handleWorkspaceChange(w.id)}
                  className={`flex-1 min-w-[70px] text-[11px] font-bold py-2 px-2 rounded-md transition-all truncate ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                  title={w.name}
                >
                  {w.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="mx-4 mb-4 h-[3px] bg-orange-500 rounded-full shrink-0" />

      <nav className="space-y-1.5 text-sm font-medium px-2 flex-1 overflow-y-auto pb-4">
        {isNavLoading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-400"></div>
          </div>
        ) : (
          navItems.map((item) => {
            const isActive = pathname === item.href
            
            const permKey = routeToPermissionKey[item.href]
            const isOwnerRestricted = isGuest && permissions && permKey && permissions[permKey] === "hidden"
            const isPaywallLocked = !isGuest && accountTier === "free" && item.href !== "/settings"
            const isLocked = isOwnerRestricted || isPaywallLocked

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  if (isOwnerRestricted) {
                    e.preventDefault()
                    setRestrictedModalOpen(true)
                  }
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? "bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/30 shadow-xs"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <span className="text-base shrink-0">{item.icon}</span>
                <span className="flex-1 truncate">{item.label}</span>
                {isLocked && <span className="text-slate-500 text-xs shrink-0" title="Restricted Access">🔒</span>}
              </Link>
            )
          })
        )}
      </nav>

      <div className="mt-auto px-4 pb-2 pt-2 text-center shrink-0 border-t border-slate-800/80">
        <span className="text-[11px] font-bold text-slate-600 tracking-widest uppercase">
          CleanBuild v1.01
        </span>
      </div>

      <Dialog open={restrictedModalOpen} onOpenChange={setRestrictedModalOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white border-2 border-slate-900 rounded-xl">
          <DialogHeader className="mb-2">
            <div className="flex justify-center mb-4 text-4xl">🔒</div>
            <DialogTitle className="text-lg font-bold text-slate-900 text-center">
              Access Restricted
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 text-center mt-2">
              The project owner has disabled your access to this specific module. Reach out to them directly if you need permissions changed.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setRestrictedModalOpen(false)} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold">
            Understood
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}