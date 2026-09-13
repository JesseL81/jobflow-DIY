"use client"

import { useState, useEffect } from "react"
import { set, clear } from "idb-keyval"
import { supabase } from "@/lib/supabase"
import { syncManager } from "@/lib/syncManager"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

type PermissionLevel = "edit" | "read-only" | "hidden"

const DEFAULT_PERMISSIONS: Record<string, PermissionLevel> = {
  schedule: "edit",
  punch_list: "edit",
  vision_board: "edit",
  expenses: "hidden", 
  selections: "edit",
  contacts: "edit",
}

export default function SettingsPage() {
  const [userEmail, setUserEmail] = useState<string>("")
  const [isPushEnabled, setIsPushEnabled] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  
  // Password State
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState({ type: "", text: "" })

  // --- Multi-Partner Collaboration State ---
  const [inviteEmail, setInviteEmail] = useState("")
  const [isInviting, setIsInviting] = useState(false)
  const [newInvitePermissions, setNewInvitePermissions] = useState<Record<string, PermissionLevel>>(DEFAULT_PERMISSIONS)
  
  // This stores ALL guests for the primary owner
  const [partners, setPartners] = useState<any[]>([]) 
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  // Guest State (When the logged-in user IS the guest)
  const [isGuest, setIsGuest] = useState(false)
  const [guestPermissions, setGuestPermissions] = useState<Record<string, PermissionLevel>>(DEFAULT_PERMISSIONS)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email) {
          setUserEmail(user.email)
          
          const activeWorkspaceId = localStorage.getItem("cleanbuild_active_workspace") || user.id

          if (activeWorkspaceId === user.id) {
            // 1. THEY OWN THIS WORKSPACE - Fetch ALL guests
            setIsGuest(false)
            
            const { data: project } = await supabase
              .from("projects")
              .select("id")
              .eq("owner_id", user.id)
              .maybeSingle()

            if (project) {
              const { data: members } = await supabase
                .from("project_members")
                .select("*")
                .eq("project_id", project.id)
                .order("created_at", { ascending: true })

              if (members) {
                setPartners(members)
              }
            }
          } else {
            // 2. THEY ARE A GUEST IN THIS WORKSPACE
            setIsGuest(true)
            
            const { data: guestInvite } = await supabase
              .from("project_members")
              .select("*")
              .eq("invite_email", user.email)
              .single()

            if (guestInvite) {
              if (guestInvite.permissions) {
                setGuestPermissions(guestInvite.permissions)
              }
              if (guestInvite.status?.includes("Pending")) {
                await supabase
                  .from("project_members")
                  .update({ status: "Active", user_id: user.id })
                  .eq("id", guestInvite.id)
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      } finally {
        setIsLoadingData(false)
      }
    }
    fetchUserData()

    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setIsPushEnabled(!!subscription)
        })
      })
    }
  }, [])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage({ type: "", text: "" })

    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "Password must be at least 6 characters." })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Passwords do not match." })
      return
    }

    setIsUpdatingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setIsUpdatingPassword(false)

    if (error) {
      setPasswordMessage({ type: "error", text: error.message })
    } else {
      setPasswordMessage({ type: "success", text: "Password updated successfully!" })
      setNewPassword("")
      setConfirmPassword("")
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  const handleTogglePush = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("Push notifications are not supported by this browser. Try installing the app to your home screen first!")
      return
    }
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (!registration) return

      if (isPushEnabled) {
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) {
          await subscription.unsubscribe()
          const { data: userData } = await supabase.auth.getUser()
          if (userData?.user?.id) {
            await supabase.from("cloud_sync")
              .delete()
              .match({ user_id: userData.user.id, store_key: "cleanbuild_push_subscription" })
          }
        }
        setIsPushEnabled(false)
      } else {
        const permission = await Notification.requestPermission()
        if (permission !== "granted") return

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidPublicKey) return

        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey)
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        })

        const { data: userData } = await supabase.auth.getUser()
        if (userData?.user?.id) {
          await supabase.from("cloud_sync").upsert({
            user_id: userData.user.id,
            store_key: "cleanbuild_push_subscription",
            data: subscription.toJSON()
          })
        }
        setIsPushEnabled(true)
      }
    } catch (error) {
      console.error("Push toggle error:", error)
    }
  }

  const handleRestoreTutorial = async () => {
    if (!window.confirm("This will replace your current data with the tutorial examples. Continue?")) return
    try {
      await clear()
      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user?.id) {
        const activeWorkspaceId = localStorage.getItem("cleanbuild_active_workspace") || userData.user.id
        await supabase.from("cloud_sync").delete().eq("user_id", activeWorkspaceId)
      }
      window.location.href = "/"
    } catch (error) {}
  }

  const handleClearAllData = async () => {
    if (!window.confirm("🚨 WARNING: Are you sure you want to completely wipe all project data? This cannot be undone.")) return
    try {
      const keysToClear = [
        "cleanbuild_expenses", "cleanbuild_punch_list", "cleanbuild_calendar_tasks",
        "cleanbuild_custom_nonworkdays", "cleanbuild_vision_board", "cleanbuild_vision_board_categories",
        "cleanbuild_selections_items", "cleanbuild_contacts", "cleanbuild_non_workdays_map",
        "cleanbuild_explicit_working_days", "cleanbuild_project_dates"
      ]
      for (const key of keysToClear) {
        await set(key, [])
        await syncManager.pushToCloud(key, [])
      }
      await set("cleanbuild_total_budget", 0)
      await syncManager.pushToCloud("cleanbuild_total_budget", 0)
      await set("cleanbuild_selections_budgets", {})
      await syncManager.pushToCloud("cleanbuild_selections_budgets", {})
      window.location.href = "/"
    } catch (error) {}
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm("🚨 WARNING: Are you sure you want to permanently delete your account and all associated project data? This cannot be undone.")) return
    const typeConfirm = window.prompt("Type 'DELETE' to confirm account deletion:")
    if (typeConfirm !== "DELETE") return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch("/api/delete-account", {
        method: "POST",
        headers: { "Authorization": `Bearer ${session?.access_token}` }
      })
      if (!response.ok) return
      await clear()
      await supabase.auth.signOut()
      window.location.href = "/login"
    } catch (error) {}
  }

  // --- NEW: Multi-Partner Collaboration Functions ---

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsInviting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch("/api/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ email: inviteEmail, permissions: newInvitePermissions })
      })
      if (!response.ok) {
        setIsInviting(false)
        return
      }
      
      // Fetch the updated list of members to get the new ID
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
         const { data: project } = await supabase.from("projects").select("id").eq("owner_id", user.id).single()
         if (project) {
           const { data: members } = await supabase.from("project_members").select("*").eq("project_id", project.id).order("created_at", { ascending: true })
           if (members) setPartners(members)
         }
      }
      setInviteEmail("")
      setNewInvitePermissions(DEFAULT_PERMISSIONS)
    } catch (error) {
    } finally {
      setIsInviting(false)
    }
  }

  const handleRevokeAccess = async (partnerId: string) => {
    if (window.confirm("Are you sure you want to remove this partner? They will immediately lose access to this project.")) {
      try {
        await supabase.from("project_members").delete().eq("id", partnerId)
        setPartners(partners.filter(p => p.id !== partnerId))
      } catch (error) {}
    }
  }

  const handleUpdateExistingPartnerPermission = async (partnerId: string, key: string, value: PermissionLevel) => {
    // 1. Optimistic UI update
    setPartners(prev => prev.map(p => {
      if (p.id === partnerId) {
        return { ...p, permissions: { ...p.permissions, [key]: value } }
      }
      return p
    }))

    // 2. Database Update using the exact ID
    const partner = partners.find(p => p.id === partnerId)
    if (partner) {
      const updatedPermissions = { ...partner.permissions, [key]: value }
      await supabase.from("project_members").update({ permissions: updatedPermissions }).eq("id", partnerId)
    }
  }

  const handleCopyLink = async (email: string) => {
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://diy.cleanbuild.us'
      const link = `${baseUrl}/login?invite=${encodeURIComponent(email)}`
      await navigator.clipboard.writeText(link)
      setCopiedLink(email)
      setTimeout(() => setCopiedLink(null), 2000)
    } catch (err) {}
  }

  return (
    <main className="p-6 bg-slate-100 min-h-screen space-y-6 flex flex-col text-slate-950">
      
      <div className="bg-slate-900 text-white p-6 md:px-8 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">⚙️ App Settings</h1>
          </div>
          <p className="text-sm font-medium text-orange-400 mt-1.5 leading-relaxed max-w-2xl">
            Manage your account, device notifications, and project data.
          </p>
        </div>
        <Button onClick={handleSignOut} className="bg-blue-600 hover:bg-blue-400 text-white font-bold shadow-sm">
          Sign Out
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start flex-1">
        
        {/* Left Column */}
        <div className="space-y-6">
          <Card className="bg-white border border-blue-200 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="pb-4 border-b border-blue-200 bg-blue-100">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-blue-950">🤝 Project Collaboration</CardTitle>
              <CardDescription className="text-xs text-blue-700/80">
                {isLoadingData ? "Loading..." : isGuest ? "Your access level for this shared project." : "Invite partners or co-owners to share this project with you."}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              
              {isLoadingData ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : isGuest ? (
                <div className="space-y-5">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg shadow-sm">
                    <p className="text-sm font-bold text-emerald-900">✅ Active Project Partner</p>
                    <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                      You have been granted access to collaborate on this build. Your permissions are listed below.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-700 block border-b pb-1">Your Permissions</Label>
                    <div className="grid gap-3 pt-1">
                      {Object.keys(guestPermissions).map((key) => {
                        const typedKey = key as keyof typeof guestPermissions;
                        const label = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                        const permValue = guestPermissions[typedKey];
                        
                        return (
                          <div key={key} className="flex items-center justify-between gap-4">
                            <span className="text-sm font-semibold text-slate-700 w-1/3">{label}</span>
                            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
                              {permValue === "edit" ? "Full Access" : permValue === "read-only" ? "Read-Only" : "Hidden"}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* List of Active/Pending Partners */}
                  {partners.map((partner, index) => (
                    <div key={partner.id} className="space-y-4">
                      <div className="flex flex-col gap-3 bg-blue-50 border border-blue-100 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{partner.invite_email}</p>
                            <p className="text-xs font-semibold text-blue-600 mt-0.5">{partner.status}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleRevokeAccess(partner.id)} className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 h-8 text-xs font-bold shadow-sm">
                            Revoke
                          </Button>
                        </div>

                        {partner.status?.toLowerCase().includes("pending") && (
                          <div className="pt-3 border-t border-blue-100 flex items-center gap-2">
                            <Button onClick={() => handleCopyLink(partner.invite_email)} className="h-8 shrink-0 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold w-full">
                              {copiedLink === partner.invite_email ? "Copied! ✅" : "Copy Invite Link"}
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 px-1">
                        <Label className="text-xs font-bold text-slate-700 block border-b pb-1">Manage Permissions for {partner.invite_email.split("@")[0]}</Label>
                        <div className="grid gap-3 pt-1">
                          {Object.keys(partner.permissions || DEFAULT_PERMISSIONS).map((key) => {
                            const typedKey = key as keyof typeof DEFAULT_PERMISSIONS;
                            const label = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                            
                            return (
                              <div key={`${partner.id}-${key}`} className="flex items-center justify-between gap-4">
                                <span className="text-sm font-semibold text-slate-700 w-1/3">{label}</span>
                                <select
                                  value={partner.permissions?.[typedKey] || "hidden"}
                                  onChange={(e) => handleUpdateExistingPartnerPermission(partner.id, typedKey, e.target.value as PermissionLevel)}
                                  className="flex-1 h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium text-slate-900"
                                >
                                  <option value="edit">Full Access (Edit)</option>
                                  <option value="read-only">Read-Only (View)</option>
                                  <option value="hidden">Hidden</option>
                                </select>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      
                      {/* Divider between partners */}
                      {index < partners.length - 1 && <div className="h-px bg-slate-200 my-6" />}
                    </div>
                  ))}

                  {/* Add New Partner Form */}
                  <div className={partners.length > 0 ? "pt-6 border-t border-slate-200" : ""}>
                    <form onSubmit={handleSendInvite} className="space-y-5">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700">Invite New Partner (Email)</Label>
                        <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@example.com" className="h-9 text-sm" required />
                      </div>

                      <div className="space-y-3">
                        <Label className="text-xs font-bold text-slate-700 block border-b pb-1">Starting Permissions</Label>
                        <div className="grid gap-3 pt-1">
                          {Object.keys(newInvitePermissions).map((key) => {
                            const typedKey = key as keyof typeof newInvitePermissions;
                            const label = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                            
                            return (
                              <div key={`new-${key}`} className="flex items-center justify-between gap-4">
                                <span className="text-sm font-semibold text-slate-700 w-1/3">{label}</span>
                                <select
                                  value={newInvitePermissions[typedKey]}
                                  onChange={(e) => setNewInvitePermissions({ ...newInvitePermissions, [typedKey]: e.target.value as PermissionLevel })}
                                  className="flex-1 h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium text-slate-900"
                                >
                                  <option value="edit">Full Access (Edit)</option>
                                  <option value="read-only">Read-Only (View)</option>
                                  <option value="hidden">Hidden</option>
                                </select>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <Button type="submit" disabled={isInviting || !inviteEmail} className="w-full bg-blue-600 hover:bg-blue-400 text-white shadow-sm font-semibold h-10 mt-2">
                        {isInviting ? "Sending..." : "Send Invite"}
                      </Button>
                    </form>
                  </div>

                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white border border-emerald-200 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="pb-4 border-b border-emerald-200 bg-emerald-100">
              <CardTitle className="text-lg font-bold text-emerald-950">Account & Security</CardTitle>
              <CardDescription className="text-xs text-emerald-700">
                Logged in as: <strong className="text-emerald-950">{userEmail}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">New Password</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Confirm Password</Label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="h-9 text-sm" />
                </div>
                {passwordMessage.text && (
                  <div className={`p-3 rounded-md text-xs font-bold ${passwordMessage.type === "error" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                    {passwordMessage.text}
                  </div>
                )}
                <Button type="submit" disabled={isUpdatingPassword || !newPassword} className="w-full bg-blue-600 hover:bg-blue-400 text-white shadow-sm font-semibold h-10">
                  {isUpdatingPassword ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card className="bg-white border border-amber-200 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="pb-4 border-b border-amber-200 bg-amber-100">
              <CardTitle className="text-lg font-bold text-amber-950 flex items-center gap-2">📱 Device Notifications</CardTitle>
              <CardDescription className="text-xs text-amber-700">
                Receive daily task reminders directly on this specific device.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-slate-900 font-bold text-sm">Lock-Screen Alerts</h3>
                <p className="text-slate-500 text-xs mt-1">Status: {isPushEnabled ? "Active" : "Disabled"}</p>
              </div>
              <Button onClick={handleTogglePush} className={`shrink-0 shadow-sm font-bold w-full sm:w-auto ${isPushEnabled ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-blue-600 hover:bg-blue-400 text-white"}`}>
                {isPushEnabled ? "🔔 Notifications Active" : "🔕 Enable Notifications"}
              </Button>
            </CardContent>
          </Card>

          <Card className={`bg-white border shadow-sm rounded-xl overflow-hidden ${isLoadingData || isGuest ? 'border-slate-200' : 'border-rose-200'}`}>
            <CardHeader className={`pb-4 border-b ${isLoadingData || isGuest ? 'border-slate-200 bg-slate-50' : 'border-rose-200 bg-rose-100'}`}>
              <CardTitle className={`text-lg font-bold flex items-center gap-2 ${isLoadingData || isGuest ? 'text-slate-500' : 'text-rose-900'}`}>⚠️ Danger Zone</CardTitle>
              <CardDescription className={`text-xs ${isLoadingData || isGuest ? 'text-slate-400' : 'text-rose-700'}`}>
                {isLoadingData ? "Loading..." : isGuest ? "Guests cannot manage raw data, but you can delete your account." : "Manage your raw database and project state."}
              </CardDescription>
            </CardHeader>
            <CardContent className={`pt-6 space-y-6 ${isLoadingData ? 'opacity-50 pointer-events-none' : ''}`}>
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div className={isGuest ? "opacity-50" : ""}>
                  <h3 className="text-slate-900 font-bold text-sm">Load Tutorial Data</h3>
                  <p className="text-slate-500 text-xs mt-1">Reset this account to see example project data.</p>
                </div>
                <Button onClick={handleRestoreTutorial} disabled={isGuest} className="shrink-0 shadow-sm font-bold bg-rose-600 hover:bg-rose-500 text-white w-full sm:w-auto">
                  👋 Load Examples
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div className={isGuest ? "opacity-50" : ""}>
                  <h3 className="text-rose-900 font-bold text-sm">Start Real Project</h3>
                  <p className="text-rose-700 text-xs mt-1">Permanently delete all data to start a blank slate.</p>
                </div>
                <Button onClick={handleClearAllData} disabled={isGuest} className="shrink-0 shadow-sm font-bold bg-rose-600 hover:bg-rose-500 text-white w-full sm:w-auto">
                  🗑️ Clear All Data
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-red-900 font-bold text-sm">Delete Account</h3>
                  <p className="text-red-700 text-xs mt-1">Permanently destroy this account and all associated data.</p>
                </div>
                <Button onClick={handleDeleteAccount} className="shrink-0 shadow-sm font-bold bg-red-700 hover:bg-red-600 text-white w-full sm:w-auto">
                  🧨 Delete Account
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
      
    </main>
  )
}