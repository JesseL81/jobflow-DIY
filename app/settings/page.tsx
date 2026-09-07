"use client"

import { useState, useEffect } from "react"
import { set, clear } from "idb-keyval"
import { supabase } from "@/lib/supabase"
import { syncManager } from "@/lib/syncManager"
import { useOfflineSync } from "@/hooks/useOfflineSync"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Helper required for Push Notifications
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

export default function SettingsPage() {
  const [userEmail, setUserEmail] = useState<string>("")
  const [isPushEnabled, setIsPushEnabled] = useState(false)
  
  // Project Dates Sync
  const [projectDates, setProjectDates] = useOfflineSync("cleanbuild_project_dates", { startDate: "2026-06-29", endDate: "2026-07-30" })
  const [localStartDate, setLocalStartDate] = useState("2026-06-29")
  const [localEndDate, setLocalEndDate] = useState("2026-07-30")
  const [isSavingDates, setIsSavingDates] = useState(false)

  // Password State
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState({ type: "", text: "" })

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data?.user?.email) {
        setUserEmail(data.user.email)
      }
    }
    fetchUser()

    // Check Push Subscription Status
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setIsPushEnabled(!!subscription)
        })
      })
    }
  }, [])

  // Sync local input state with the database on load
  useEffect(() => {
    if (projectDates?.startDate) setLocalStartDate(projectDates.startDate)
    if (projectDates?.endDate) setLocalEndDate(projectDates.endDate)
  }, [projectDates])

  const handleSaveTimeline = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingDates(true)
    await setProjectDates({ startDate: localStartDate, endDate: localEndDate })
    setIsSavingDates(false)
    alert("Project timeline saved successfully! The Dashboard progress bar will now reflect these dates.")
  }

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
      
      if (!registration) {
        alert("Service Worker is offline. Push notifications require the live Vercel site (HTTPS) or a local production build to function.")
        return
      }

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
        if (permission !== "granted") {
          alert("Permission denied. You must allow notifications in your browser settings to use this feature.")
          return
        }

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidPublicKey) {
          alert("Security key missing. Ensure NEXT_PUBLIC_VAPID_PUBLIC_KEY is set.")
          return
        }

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
        alert("Success! This device will now receive CleanBuild lock-screen alerts.")
      }
    } catch (error) {
      console.error("Failed to toggle push notifications:", error)
      alert("An error occurred while setting up notifications.")
    }
  }

  const handleRestoreTutorial = async () => {
    const isConfirmed = window.confirm("This will replace your current data with the tutorial examples. Continue?")
    if (!isConfirmed) return

    try {
      await clear()
      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user?.id) {
        await supabase.from("cloud_sync").delete().eq("user_id", userData.user.id)
      }
      window.location.href = "/"
    } catch (error) {
      console.error("Failed to restore tutorial:", error)
      alert("An error occurred while trying to load the tutorial.")
    }
  }

  const handleClearAllData = async () => {
    const isConfirmed = window.confirm(
      "🚨 WARNING: Are you sure you want to completely wipe all project data? This cannot be undone."
    )
    if (!isConfirmed) return

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
    } catch (error) {
      console.error("Failed to wipe data:", error)
      alert("An error occurred while trying to clear your data.")
    }
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
        <Button 
          onClick={handleSignOut}
          className="bg-blue-600 hover:bg-blue-400 text-white font-bold shadow-sm"
        >
          Sign Out
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start flex-1">
        
        {/* Left Column */}
        <div className="space-y-6">
          
          <Card className="bg-white border shadow-sm rounded-xl">
            <CardHeader className="pb-4 border-b border-slate-100">
              <CardTitle className="text-lg font-bold">Project Configuration</CardTitle>
              <CardDescription className="text-xs">
                Set your build timeline to track progress on the Dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <form onSubmit={handleSaveTimeline} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Project Start Date</Label>
                    <Input 
                      type="date" 
                      value={localStartDate}
                      onChange={(e) => setLocalStartDate(e.target.value)}
                      className="h-9 text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Target End Date</Label>
                    <Input 
                      type="date" 
                      value={localEndDate}
                      onChange={(e) => setLocalEndDate(e.target.value)}
                      className="h-9 text-sm"
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isSavingDates}
                  className="w-full bg-blue-600 hover:bg-blue-400 text-white shadow-sm font-semibold h-10"
                >
                  {isSavingDates ? "Saving..." : "Save Timeline"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-white border shadow-sm rounded-xl">
            <CardHeader className="pb-4 border-b border-slate-100">
              <CardTitle className="text-lg font-bold">Account & Security</CardTitle>
              <CardDescription className="text-xs">
                Logged in as: <strong className="text-slate-900">{userEmail}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">New Password</Label>
                  <Input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Confirm Password</Label>
                  <Input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="h-9 text-sm"
                  />
                </div>
                
                {passwordMessage.text && (
                  <div className={`p-3 rounded-md text-xs font-bold ${passwordMessage.type === "error" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                    {passwordMessage.text}
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={isUpdatingPassword || !newPassword}
                  className="w-full bg-blue-600 hover:bg-blue-400 text-white shadow-sm font-semibold h-10"
                >
                  {isUpdatingPassword ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>

        </div>

        {/* Right Column */}
        <div className="space-y-6">
          
          <Card className="bg-white border shadow-sm rounded-xl">
            <CardHeader className="pb-4 border-b border-slate-100">
              <CardTitle className="text-lg font-bold">Device Notifications</CardTitle>
              <CardDescription className="text-xs">
                Receive daily task reminders directly on this specific device.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-slate-900 font-bold text-sm">Lock-Screen Alerts</h3>
                <p className="text-slate-500 text-xs mt-1">Status: {isPushEnabled ? "Active" : "Disabled"}</p>
              </div>
              <Button 
                onClick={handleTogglePush}
                className={`shrink-0 shadow-sm font-bold w-full sm:w-auto ${isPushEnabled ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-blue-600 hover:bg-blue-400 text-white"}`}
              >
                {isPushEnabled ? "🔔 Notifications Active" : "🔕 Enable Notifications"}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white border shadow-sm rounded-xl border-rose-100">
            <CardHeader className="pb-4 border-b border-rose-100 bg-rose-50/30 rounded-t-xl">
              <CardTitle className="text-lg font-bold text-rose-900">Danger Zone</CardTitle>
              <CardDescription className="text-xs text-rose-700">
                Manage your raw database and project state.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <h3 className="text-slate-900 font-bold text-sm">Load Tutorial Data</h3>
                  <p className="text-slate-500 text-xs mt-1">Reset this account to see example project data.</p>
                </div>
                <Button 
                  onClick={handleRestoreTutorial}
                  className="shrink-0 shadow-sm font-bold bg-rose-600 hover:bg-rose-500 text-white w-full sm:w-auto"
                >
                  👋 Load Examples
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-rose-900 font-bold text-sm">Start Real Project</h3>
                  <p className="text-rose-700 text-xs mt-1">Permanently delete all data to start a blank slate.</p>
                </div>
                <Button 
                  onClick={handleClearAllData}
                  className="shrink-0 shadow-sm font-bold bg-rose-600 hover:bg-rose-500 text-white w-full sm:w-auto"
                >
                  🗑️ Clear All Data
                </Button>
              </div>

            </CardContent>
          </Card>

        </div>
      </div>
      
    </main>
  )
}