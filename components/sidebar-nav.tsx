"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { syncManager } from "@/lib/syncManager"
import { supabase } from "@/lib/supabase"
import { clear } from "idb-keyval"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

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

type Workspace = { id: string; name: string; isOwner: boolean }

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
  
  const [projectName, setProjectName] = useState("My Project")
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState("")

  const [permissions, setPermissions] = useState<Record<string, string> | null>(null)
  const [isGuest, setIsGuest] = useState(false)
  const [accountTier, setAccountTier] = useState<string>("free")
  const [isNavLoading, setIsNavLoading] = useState(true)

  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>("")
  const [isSwitching, setIsSwitching] = useState(false)
  
  const [restrictedModalOpen, setRestrictedModalOpen] = useState(false)

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
      } catch (e) {}
    }
    verifyCloudName()
  }, [])

  useEffect(() => {
    const fetchCoreData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.email) return

        const { data: profile } = await supabase.from("profiles").select("tier").eq("id", user.id).maybeSingle()
        if (profile) setAccountTier(profile.tier)

        const { data: workspaceData, error: rpcError } = await supabase.rpc("get_workspace_list", {
          current_user_id: user.id,
          current_email: user.email
        })
        
        let availableWorkspaces: Workspace[] = []
        if (workspaceData && !rpcError) {
          availableWorkspaces = workspaceData.map((w: any) => ({
            id: w.id,
            name: w.name,
            isOwner: w.is_owner
          }))
        } else {
          availableWorkspaces = [{ id: user.id, name: "🏠 My Build", isOwner: true }]
        }
        
        setWorkspaces(availableWorkspaces)

        let currentWorkspaceId = localStorage.getItem("cleanbuild_active_workspace")
        
        if (!currentWorkspaceId || !availableWorkspaces.find(w => w.id === currentWorkspaceId)) {
          const sharedWorkspace = availableWorkspaces.find(w => !w.isOwner)
          currentWorkspaceId = sharedWorkspace ? sharedWorkspace.id : user.id
          localStorage.setItem("cleanbuild_active_workspace", currentWorkspaceId)
        }
        
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
    setProjectName(finalName)
    localStorage.setItem("cleanbuild_project_name", finalName)
    
    try {
      await syncManager.pushToCloud("cleanbuild_project_name", finalName)
    } catch (e) {}

    window.dispatchEvent(new Event("project-name-updated"))
    setIsEditingName(false)
  }

  const handleWorkspaceChange = async (newWorkspaceId: string) => {
    if (newWorkspaceId === activeWorkspaceId) return

    setIsSwitching(true)
    await clear()
    localStorage.setItem("cleanbuild_active_workspace", newWorkspaceId)
    localStorage.removeItem("cleanbuild_project_name")
    window.location.href = "/dashboard"
  }

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
            <div className="flex items-center gap-3 w-full group">
              {!isGuest && accountTier !== "free" && (
                <button 
                  onClick={() => { setTempName(projectName); setIsEditingName(true); }}
                  className="text-base text-slate-500 hover:text-orange-400 transition-colors shrink-0"
                  title="Edit Project Name"
                >
                  ✏️
                </button>
              )}
              <span className="text-base font-bold text-slate-200 truncate" title={projectName}>
                {projectName}
              </span>
            </div>
          )}
        </div>
      </div>

      {workspaces.length > 1 && (
        <div className="px-4 pb-4 shrink-0">
          <div className="bg-slate-900 p-1.5 rounded-lg flex items-center border border-slate-700 shadow-inner gap-1">
            {workspaces.map((w) => {
              const isActive = activeWorkspaceId === w.id
              return (
                <button
                  key={w.id}
                  onClick={() => handleWorkspaceChange(w.id)}
                  className={`flex-1 text-[11px] font-bold py-2 px-2 rounded-md transition-all truncate ${
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