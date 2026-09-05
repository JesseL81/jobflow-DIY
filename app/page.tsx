"use client"

import { useState, useEffect, useMemo } from "react"
import { set, clear } from "idb-keyval"
import { supabase } from "@/lib/supabase"
import { syncManager } from "@/lib/syncManager"
import { useOfflineSync } from "@/hooks/useOfflineSync"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import Link from "next/link"

interface Expense {
  id: number
  title?: string
  category?: string
  materials: number
  labor: number
}

const INITIAL_EXPENSES = [
  { id: 1, title: "Foundation Concrete", category: "Foundation", materials: 2770, labor: 750 },
  { id: 2, title: "👋 Welcome to Expenses! Log your costs here.", category: "General", materials: 0, labor: 0 },
  { id: 3, title: "Click 'Edit' to update or delete this example.", category: "General", materials: 0, labor: 0 }
]

const INITIAL_PUNCH_LIST: PunchItem[] = [
  { id: 1, text: "👋 Welcome to CleanBuild! Check this box to complete a task.", category: "General To-Do", completed: false, assignedEmails: [] },
  { id: 2, text: "Click 'Edit' to assign an email. (We'll email them a reminder!)", category: "General To-Do", completed: false, assignedEmails: [] },
  { id: 3, text: "Delete this task using the 'Edit' menu.", category: "General To-Do", completed: false, assignedEmails: [] },
]

const CATEGORIES = [
  "All Categories",
  "General To-Do",
  "Framing & Drywall",
  "Plumbing & HVAC",
  "Electrical",
  "Finishes & Paint",
  "Exterior & Landscaping",
]

interface CustomNonWorkday {
  date: string
  title?: string
  isFromLog?: boolean
}

interface CalendarTask {
  id: number
  title: string
  startDate: string
  endDate: string
}

interface PunchItem {
  id: number
  text: string
  category: string
  notes?: string
  completed: boolean
  dueDate?: string 
  assignedEmails?: string[]
  linkedTaskId?: number
  linkedTaskOffset?: number
}

const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return ""
  const cleanDate = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr
  const [year, month, day] = cleanDate.split("-")
  if (!year || !month || !day) return dateStr
  return `${parseInt(month, 10)}/${parseInt(day, 10)}/${year.slice(-2)}`
}

const getLocalTodayStr = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export default function DashboardPage() {
  const [expenses, , expensesLoaded] = useOfflineSync<Expense[]>("cleanbuild_expenses", INITIAL_EXPENSES)
  const [totalBudget, , budgetLoaded] = useOfflineSync<number>("cleanbuild_total_budget", 23402)
  const [customNonWorkdays, , nonWorkdaysLoaded] = useOfflineSync<CustomNonWorkday[]>("cleanbuild_custom_nonworkdays", []) 
  const [punchList, setPunchList, punchLoaded] = useOfflineSync<PunchItem[]>("cleanbuild_punch_list", INITIAL_PUNCH_LIST)
  const [calendarTasks, , calendarLoaded] = useOfflineSync<CalendarTask[]>("cleanbuild_calendar_tasks", [])
  
  const isAppLoaded = expensesLoaded && budgetLoaded && nonWorkdaysLoaded && punchLoaded && calendarLoaded

  const [newPunchText, setNewPunchText] = useState("")
  const [editingPunch, setEditingPunch] = useState<PunchItem | null>(null)
  
  const [isLinked, setIsLinked] = useState<boolean>(false)
  const [emailInput, setEmailInput] = useState("")
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("")

  useEffect(() => {
    const fetchUserEmail = async () => {
      const { data } = await supabase.auth.getUser()
      if (data?.user?.email) {
        setCurrentUserEmail(data.user.email)
      }
    }
    fetchUserEmail()
  }, [])

  const handleOpenAddModal = () => {
    if (!newPunchText.trim()) return
    setIsLinked(false)
    setEditingPunch({
      id: Date.now(),
      text: newPunchText.trim(),
      category: "General To-Do",
      completed: false,
      assignedEmails: currentUserEmail ? [currentUserEmail.toLowerCase()] : [],
      linkedTaskId: undefined,
      linkedTaskOffset: 0
    })
    setEmailInput("")
  }

  const handleTogglePunch = async (id: number) => {
    const updated = punchList.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    await setPunchList(updated)
  }

  const handleDeletePunch = async (id: number) => {
    const updated = punchList.filter((item) => item.id !== id)
    await setPunchList(updated)
  }

  const handleOpenEditModal = (item: PunchItem) => {
    let emails = item.assignedEmails || []
    if ((item as any).assignedEmail && emails.length === 0) {
      emails = [(item as any).assignedEmail]
    }
    setIsLinked(!!item.linkedTaskId)
    setEditingPunch({ 
      ...item, 
      assignedEmails: emails,
      linkedTaskOffset: item.linkedTaskOffset || 0
    })
    setEmailInput("")
  }

  const handleAddEmail = () => {
    if (!emailInput.trim() || !editingPunch) return
    const trimmed = emailInput.trim().toLowerCase()
    const currentEmails = editingPunch.assignedEmails || []
    
    if (!currentEmails.includes(trimmed)) {
      setEditingPunch({
        ...editingPunch,
        assignedEmails: [...currentEmails, trimmed]
      })
    }
    setEmailInput("")
  }

  const handleRemoveEmail = (emailToRemove: string) => {
    if (!editingPunch) return
    setEditingPunch({
      ...editingPunch,
      assignedEmails: (editingPunch.assignedEmails || []).filter(e => e !== emailToRemove)
    })
  }

  const handleSavePunchEdit = async () => {
    if (!editingPunch) return
    
    const finalPunch = {
      ...editingPunch,
      linkedTaskId: isLinked && editingPunch.linkedTaskId ? editingPunch.linkedTaskId : undefined,
      linkedTaskOffset: isLinked ? (editingPunch.linkedTaskOffset || 0) : undefined,
      dueDate: isLinked ? "" : editingPunch.dueDate
    }
    
    const exists = punchList.some(item => item.id === finalPunch.id)
    let updated;
    
    if (exists) {
      updated = punchList.map(item => item.id === finalPunch.id ? finalPunch : item)
    } else {
      updated = [...punchList, finalPunch]
    }
    
    await setPunchList(updated)
    setEditingPunch(null)
    setNewPunchText("")
  }

  const getAlertStatus = (dueDate?: string, completed?: boolean) => {
    if (!dueDate || completed) return null
    const today = getLocalTodayStr()
    if (dueDate === today) return "today"
    if (dueDate < today) return "overdue"
    return "upcoming"
  }

  // Dashboard Item Sorting
  const sortedPunchList = useMemo(() => {
    return [...punchList].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1

      const getDisplayDate = (item: PunchItem) => {
        if (item.linkedTaskId) {
          const linkedTask = calendarTasks.find(t => t.id === item.linkedTaskId)
          if (linkedTask) {
            const baseDate = new Date(linkedTask.endDate + "T00:00:00")
            if (item.linkedTaskOffset) baseDate.setDate(baseDate.getDate() + item.linkedTaskOffset)
            return baseDate.toISOString().split("T")[0]
          }
        }
        return item.dueDate || ""
      }

      const dateA = getDisplayDate(a)
      const dateB = getDisplayDate(b)

      if (dateA && dateB) return new Date(dateA).getTime() - new Date(dateB).getTime()
      if (dateA && !dateB) return -1
      if (!dateA && dateB) return 1
      return a.id - b.id
    })
  }, [punchList, calendarTasks])

  const totalPunchItems = punchList.length
  const completedPunchItems = punchList.filter((item) => item.completed).length
  const percentPunchCompleted = totalPunchItems > 0 ? Math.round((completedPunchItems / totalPunchItems) * 100) : 0

  const totalMaterials = expenses.reduce((sum, item) => sum + (item.materials || 0), 0)
  const totalLabor = expenses.reduce((sum, item) => sum + (item.labor || 0), 0)
  const totalSpent = totalMaterials + totalLabor
  const remainingBudget = totalBudget - totalSpent
  const percentBudgetUsed = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0

  const projStart = new Date("2026-06-29T00:00:00")
  const projEnd = new Date("2026-07-30T00:00:00")
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const totalTimeMs = projEnd.getTime() - projStart.getTime()
  const elapsedTimeMs = today.getTime() - projStart.getTime()
  const totalDays = Math.max(1, Math.round(totalTimeMs / (1000 * 60 * 60 * 24)) + 1)
  const currentDay = Math.min(totalDays, Math.max(1, Math.round(elapsedTimeMs / (1000 * 60 * 60 * 24)) + 1))
  const percentTimeUsed = Math.min(100, Math.max(0, Math.round((currentDay / totalDays) * 100)))

  const handleRestoreTutorial = async () => {
    const isConfirmed = window.confirm(
      "This will replace your current data with the tutorial examples. Continue?"
    )
    
    if (!isConfirmed) return

    try {
      await clear()
      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user?.id) {
        await supabase
          .from("cloud_sync")
          .delete()
          .eq("user_id", userData.user.id)
      }
      window.location.reload()
    } catch (error) {
      console.error("Failed to restore tutorial:", error)
      alert("An error occurred while trying to load the tutorial.")
    }
  }

  const handleClearAllData = async () => {
    const isConfirmed = window.confirm(
      "🚨 WARNING: Are you sure you want to completely wipe all project data? This will delete your schedule, punch list, and vision board forever. This cannot be undone."
    )
    
    if (!isConfirmed) return

    try {
      const keysToClear = [
        "cleanbuild_expenses",
        "cleanbuild_punch_list",
        "cleanbuild_calendar_tasks",
        "cleanbuild_custom_nonworkdays",
        "cleanbuild_vision_board",
        "cleanbuild_vision_board_categories",
        "cleanbuild_selections_items",
        "cleanbuild_contacts",
        "cleanbuild_non_workdays_map",
        "cleanbuild_explicit_working_days"
      ]

      for (const key of keysToClear) {
        await set(key, [])
        await syncManager.pushToCloud(key, [])
      }

      await set("cleanbuild_total_budget", 0)
      await syncManager.pushToCloud("cleanbuild_total_budget", 0)
      
      await set("cleanbuild_selections_budgets", {})
      await syncManager.pushToCloud("cleanbuild_selections_budgets", {})

      window.location.reload()
    } catch (error) {
      console.error("Failed to wipe data:", error)
      alert("An error occurred while trying to clear your data.")
    }
  }

  const isNewTask = editingPunch && !punchList.some(p => p.id === editingPunch.id)
  
  return (
    <main className="p-6 bg-slate-100 min-h-screen space-y-6 flex flex-col text-slate-950">
      
      <div className="bg-slate-900 text-white p-6 md:px-8 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:h-[140px] shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">📊 Dashboard</h1>
          </div>
          <p className="text-sm font-medium text-orange-400 mt-1.5 leading-relaxed max-w-2xl">
            Real-time site overview, active budget tracking, and job site management.
          </p>
        </div>
      </div>

      <Card className="overflow-hidden border shadow-sm bg-white flex-1">
        <div className="p-6 space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-white border shadow-2xs">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Total Budget</CardDescription>
                <CardTitle className="text-xl font-bold">${totalBudget.toLocaleString()}</CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-white border shadow-2xs">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Total Spent</CardDescription>
                <CardTitle className="text-xl font-bold text-blue-600">${totalSpent.toLocaleString()}</CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-white border shadow-2xs">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Remaining Funds</CardDescription>
                <CardTitle className={`text-xl font-bold ${remainingBudget < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  ${remainingBudget.toLocaleString()}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-white border shadow-2xs">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Active Delays</CardDescription>
                <CardTitle className="text-xl font-bold text-rose-600">
                  {customNonWorkdays.length} {customNonWorkdays.length === 1 ? "Day" : "Days"}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-white border shadow-2xs">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm font-semibold">Budget Utilization</CardTitle>
                  <span className="text-xs font-bold text-slate-600">
                    {percentBudgetUsed}% Used (${totalSpent.toLocaleString()} / ${totalBudget.toLocaleString()})
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500" 
                    style={{ width: isAppLoaded ? `${percentBudgetUsed}%` : "0%" }} 
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border shadow-2xs">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm font-semibold">Project Timeline Progress</CardTitle>
                  <span className="text-xs font-bold text-slate-600">
                    Day {currentDay} of {totalDays} Calendar Days ({percentTimeUsed}%)
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-500" 
                    style={{ width: isAppLoaded ? `${percentTimeUsed}%` : "0%" }} 
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <Card className="bg-white border shadow-2xs md:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm font-bold text-slate-900">✅ Site Punch List / To-Do's</CardTitle>
                  
                  <div className="flex items-center gap-3">
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2.5 py-0.5 rounded">
                      {completedPunchItems} of {totalPunchItems} Completed ({percentPunchCompleted}%)
                    </span>
                    <Link href="/punch-list" className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                      View All →
                    </Link>
                  </div>
                </div>
                <CardDescription className="text-xs">Track quick daily tasks, alerts, and send email reminders.</CardDescription>

                {totalPunchItems > 0 && (
                  <div className="pt-2">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                      <div 
                        className="h-full bg-blue-600 transition-all duration-500" 
                        style={{ width: isAppLoaded ? `${percentPunchCompleted}%` : "0%" }} 
                      />
                    </div>
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add quick task (e.g. Call inspector)..."
                    value={newPunchText}
                    onChange={(e) => setNewPunchText(e.target.value)}
                    className="text-xs h-9 shadow-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newPunchText.trim()) {
                        handleOpenAddModal()
                      }
                    }}
                  />
                  <Button 
                    size="sm" 
                    disabled={!newPunchText.trim()}
                    className={`text-xs h-9 px-4 shadow-sm transition-colors ${
                      newPunchText.trim() 
                        ? "bg-blue-600 hover:bg-blue-700 text-white" 
                        : "bg-slate-200 text-slate-400 cursor-not-allowed hover:bg-slate-200"
                    }`} 
                    onClick={handleOpenAddModal}
                  >
                    Add Task
                  </Button>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pt-2">
                  {sortedPunchList.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-3 text-center border border-dashed rounded">
                      No punch list items yet.
                    </p>
                  ) : (
                    sortedPunchList.map((item) => {
                      const legacyEmail = (item as any).assignedEmail
                      const emailsToDisplay = item.assignedEmails && item.assignedEmails.length > 0 
                        ? item.assignedEmails 
                        : (legacyEmail ? [legacyEmail] : [])

                      const linkedTask = item.linkedTaskId ? calendarTasks.find(t => t.id === item.linkedTaskId) : null
                      let displayDueDate = item.dueDate
                      
                      if (linkedTask) {
                        const baseDate = new Date(linkedTask.endDate + "T00:00:00")
                        if (item.linkedTaskOffset) {
                          baseDate.setDate(baseDate.getDate() + item.linkedTaskOffset)
                        }
                        displayDueDate = baseDate.toISOString().split("T")[0]
                      }

                      const alertStatus = getAlertStatus(displayDueDate, item.completed)

                      return (
                        <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg gap-3">
                          <label className="flex items-start sm:items-center gap-3 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => handleTogglePunch(item.id)}
                              className="h-4 w-4 accent-blue-600 rounded mt-0.5 sm:mt-0"
                            />
                            <div className="flex flex-col">
                              <span className={`text-sm font-semibold ${item.completed ? "line-through text-slate-400" : "text-slate-800"}`}>
                                {item.text}
                              </span>
                              
                              {(!item.completed && (displayDueDate || emailsToDisplay.length > 0 || item.category !== "General To-Do")) && (
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  {item.category !== "General To-Do" && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                      {item.category}
                                    </span>
                                  )}
                                  
                                  {displayDueDate && (
                                    <Badge variant="outline" className={`text-[10px] ${
                                      item.linkedTaskId 
                                        ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                                        : "bg-slate-50 text-slate-600 border-slate-200"
                                    }`}>
                                      {item.linkedTaskId ? `🔗 Linked: ${linkedTask?.title || "Task"} (Due: ` : "📅 Due: "}
                                      {formatDisplayDate(displayDueDate)}
                                      {item.linkedTaskOffset ? ` [${item.linkedTaskOffset > 0 ? '+' : ''}${item.linkedTaskOffset}d]` : ""}
                                      {item.linkedTaskId ? ")" : ""}
                                    </Badge>
                                  )}

                                  {emailsToDisplay.map(email => (
                                    <span key={email} className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                      ✉️ {email}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </label>

                          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                            <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(item)} className="h-7 text-xs px-2 shadow-xs">
                              ✏️ Edit / Notify
                            </Button>
                            <button onClick={() => handleDeletePunch(item.id)} className="text-slate-400 hover:text-rose-600 h-7 w-7 flex items-center justify-center rounded hover:bg-rose-50 transition-colors">
                              ✕
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border shadow-2xs md:col-span-1">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm font-bold text-slate-900">🚫 Logged Delays</CardTitle>
                  <Link href="/schedule" className="text-xs text-blue-600 hover:underline">
                    View Schedule →
                  </Link>
                </div>
                <CardDescription className="text-xs">Days flagged as off from the calendar.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                  {[...customNonWorkdays]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((day, idx) => (
                      <div key={idx} className="bg-rose-50 border border-rose-100 rounded-lg p-3">
                        <div className="text-sm font-bold text-rose-900">
                          {new Date(day.date + "T00:00:00").toLocaleDateString("en-US", {
                            month: "numeric",
                            day: "numeric",
                            year: "2-digit"
                          })}
                        </div>
                        <div className="text-xs text-rose-700 mt-0.5">
                          {day.title || "Non-workday"}
                        </div>
                      </div>
                    ))}
                    
                  {customNonWorkdays.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-6 border-2 border-dashed border-slate-100 rounded-lg mt-2">
                      No delays logged.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </Card>

      <Dialog open={!!editingPunch} onOpenChange={(open) => !open && setEditingPunch(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {isNewTask ? "Add Task Details" : "Edit Task & Notifications"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Set due dates for alerts or assign emails to trigger automated notifications.
            </DialogDescription>
          </DialogHeader>

          {editingPunch && (
            <div className="grid gap-4 py-2">
              <div>
                <Label htmlFor="edit-task" className="text-xs font-bold text-slate-700">Task Name *</Label>
                <Input
                  id="edit-task"
                  value={editingPunch.text}
                  onChange={(e) => setEditingPunch({ ...editingPunch, text: e.target.value })}
                  className="mt-1 text-sm shadow-sm h-10"
                />
              </div>

              <div>
                <Label htmlFor="task-cat" className="text-xs font-bold text-slate-700">Category</Label>
                <select
                  id="task-cat"
                  value={editingPunch.category || "General To-Do"}
                  onChange={(e) => setEditingPunch({ ...editingPunch, category: e.target.value })}
                  className="flex w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  {CATEGORIES.filter((c) => c !== "All Categories").map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-4">
                <div className="bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs font-semibold text-slate-700">
                      Due Date (For Alerts)
                    </Label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isLinked}
                        onChange={(e) => setIsLinked(e.target.checked)}
                        className="h-4 w-4 accent-blue-600 rounded"
                      />
                      <span className="text-xs font-bold text-blue-600">Link to Schedule</span>
                    </label>
                  </div>
                  
                  <div className="w-full">
                    {isLinked ? (
                      <select
                        value={editingPunch.linkedTaskId || ""}
                        onChange={(e) => setEditingPunch({ ...editingPunch, linkedTaskId: e.target.value === "" ? undefined : Number(e.target.value) })}
                        className={`flex w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none ${!editingPunch.linkedTaskId ? "text-slate-500" : "text-slate-900"}`}
                      >
                        <option value="" disabled>Select calendar task...</option>
                        {calendarTasks.length === 0 && (
                          <option disabled>No calendar tasks found</option>
                        )}
                        {calendarTasks.map(t => (
                          <option key={t.id} value={t.id} className="text-slate-900">
                            {t.title} ({formatDisplayDate(t.endDate)})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="relative w-full">
                        <Input 
                          id="task-date" 
                          type="date"
                          value={editingPunch.dueDate || ""}
                          onChange={(e) => setEditingPunch({ ...editingPunch, dueDate: e.target.value })} 
                          className="flex w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8 relative z-10 bg-transparent"
                        />
                        {!editingPunch.dueDate && (
                          <div className="absolute inset-y-1 left-1 right-10 bg-white flex items-center pl-2 pointer-events-none z-0">
                            <span className="text-slate-500 text-sm">Due Date...</span>
                          </div>
                        )}
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-base z-20">
                          📅
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {isLinked && editingPunch.linkedTaskId && (
                    <div className="flex items-center justify-center gap-2 bg-slate-50 p-2 rounded-md border border-slate-200 mt-3">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Offset (Days)</Label>
                      <Input 
                        type="number" 
                        value={editingPunch.linkedTaskOffset || 0}
                        onChange={(e) => setEditingPunch({ ...editingPunch, linkedTaskOffset: e.target.value === "" ? 0 : parseInt(e.target.value, 10) })}
                        className="h-7 w-16 text-xs text-center px-1 shadow-sm bg-white"
                      />
                      <span className="text-[10px] text-slate-400 font-medium">
                        (- for lead before, + for lag after)
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="pt-3 border-t border-slate-100">
                  <Label className="text-xs font-semibold text-slate-700 block mb-1.5">Email</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="email"
                      placeholder="name@example.com"
                      value={emailInput} 
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleAddEmail()
                        }
                      }} 
                      className="shadow-sm h-10 text-sm"
                    />
                    <Button type="button" onClick={handleAddEmail} className="bg-slate-900 hover:bg-slate-800 text-white px-4 h-10 shadow-sm">
                      Add
                    </Button>
                  </div>
                  
                  {(editingPunch.assignedEmails || []).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {editingPunch.assignedEmails?.map((email, idx) => (
                        <span key={idx} className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium">
                          {email}
                          <button 
                            type="button" 
                            onClick={() => handleRemoveEmail(email)} 
                            className="hover:text-rose-600 transition-colors"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-2">
                <Label htmlFor="task-notes" className="text-xs font-bold text-slate-700">Additional Notes (Optional)</Label>
                <textarea 
                  id="task-notes" 
                  rows={3}
                  placeholder="Details, measurements, or materials needed..." 
                  value={editingPunch.notes || ""} 
                  onChange={(e) => setEditingPunch({ ...editingPunch, notes: e.target.value })} 
                  className="w-full mt-1 p-2.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between sm:justify-between items-center pt-2 border-t">
            {editingPunch && !isNewTask ? (
              <Button variant="destructive" size="sm" onClick={() => handleDeletePunch(editingPunch.id)} className="shadow-sm">
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditingPunch(null)} className="shadow-sm">
                Cancel
              </Button>
              <Button onClick={handleSavePunchEdit} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                {isNewTask ? "Create Task" : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-8 border border-slate-200 bg-white rounded-xl p-6 flex flex-col gap-6">
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h3 className="text-slate-900 font-bold text-sm">Load Onboarding Tutorial</h3>
            <p className="text-slate-500 text-xs mt-1">Reset this account to a "brand new user" state to see the example project data.</p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleRestoreTutorial}
            className="shrink-0 shadow-sm font-bold text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            👋 Load Examples
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-rose-900 font-bold text-sm">Start Real Project (Clear Data)</h3>
            <p className="text-rose-700 text-xs mt-1">Permanently delete all examples, tasks, and schedule items to start a true blank slate.</p>
          </div>
          <Button 
            variant="destructive" 
            onClick={handleClearAllData}
            className="shrink-0 shadow-sm font-bold"
          >
            🗑️ Clear All Data
          </Button>
        </div>

      </div>

      <div className="w-full text-center py-6 text-xs text-slate-500 border-t border-slate-200 mt-8">
        CleanBuild v1.02
      </div>

    </main>
  )
}