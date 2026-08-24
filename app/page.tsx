"use client"

import { useState, useEffect } from "react"
import { get, set } from "idb-keyval"
import { syncManager } from "@/lib/syncManager"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
// THE FIX: DialogDescription has been added to this import list below!
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import Link from "next/link"

interface Expense {
  id: number
  materials: number
  labor: number
}

interface CustomNonWorkday {
  date: string
  title?: string
  isFromLog?: boolean
}

interface PunchItem {
  id: number
  text: string
  category: string
  notes?: string
  completed: boolean
  dueDate?: string 
  assignedEmail?: string
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
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [totalBudget, setTotalBudget] = useState<number>(23402)
  const [customNonWorkdays, setCustomNonWorkdays] = useState<CustomNonWorkday[]>([])
  
  // Punch List State
  const [punchList, setPunchList] = useState<PunchItem[]>([])
  const [newPunchText, setNewPunchText] = useState("")
  
  // Edit Punch Item Modal State
  const [editingPunch, setEditingPunch] = useState<PunchItem | null>(null)

  const loadDashboardData = async () => {
    try {
      const savedExpenses = await get<Expense[]>("builderlite_expenses")
      const savedBudget = await get<number>("builderlite_total_budget")
      const savedCustomNonWorkdays = await get<CustomNonWorkday[]>("jobflow_custom_nonworkdays")
      const savedPunch = await get<PunchItem[]>("jobflow_punch_list")

      if (savedExpenses) setExpenses(savedExpenses)
      if (savedBudget !== undefined) setTotalBudget(savedBudget)
      if (savedCustomNonWorkdays) setCustomNonWorkdays(savedCustomNonWorkdays)
      if (savedPunch) setPunchList(savedPunch)

      const cloudPunch = await syncManager.pullFromCloud("jobflow_punch_list")
      const cloudExpenses = await syncManager.pullFromCloud("builderlite_expenses")
      const cloudBudget = await syncManager.pullFromCloud("builderlite_total_budget")
      const cloudCustomNonWorkdays = await syncManager.pullFromCloud("jobflow_custom_nonworkdays")

      if (cloudPunch) setPunchList(cloudPunch)
      if (cloudExpenses) setExpenses(cloudExpenses)
      if (cloudBudget !== undefined && cloudBudget !== null) setTotalBudget(cloudBudget)
      if (cloudCustomNonWorkdays) setCustomNonWorkdays(cloudCustomNonWorkdays)

    } catch (e) {
      console.error("Error loading dashboard data:", e)
    }
  }

  useEffect(() => {
    loadDashboardData()

    const handleSync = () => loadDashboardData()
    window.addEventListener("expenses-updated", handleSync)

    return () => {
      window.removeEventListener("expenses-updated", handleSync)
    }
  }, [])

  // --- PUNCH LIST LOGIC ---
  const handleAddPunchItem = async () => {
    if (!newPunchText.trim()) return
    const newItem: PunchItem = { 
      id: Date.now(), 
      text: newPunchText.trim(), 
      category: "General To-Do", 
      completed: false 
    }
    const updated = [...punchList, newItem]
    setPunchList(updated)
    setNewPunchText("")
    
    await set("jobflow_punch_list", updated)
    await syncManager.pushToCloud("jobflow_punch_list", updated)
  }

  const handleTogglePunch = async (id: number) => {
    const updated = punchList.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    setPunchList(updated)
    
    await set("jobflow_punch_list", updated)
    await syncManager.pushToCloud("jobflow_punch_list", updated)
  }

  const handleDeletePunch = async (id: number) => {
    const updated = punchList.filter((item) => item.id !== id)
    setPunchList(updated)
    
    await set("jobflow_punch_list", updated)
    await syncManager.pushToCloud("jobflow_punch_list", updated)
  }

  const handleSavePunchEdit = async () => {
    if (!editingPunch) return
    const updated = punchList.map(item => item.id === editingPunch.id ? editingPunch : item)
    setPunchList(updated)
    
    await set("jobflow_punch_list", updated)
    await syncManager.pushToCloud("jobflow_punch_list", updated)
    setEditingPunch(null)
  }

  // Determine Alert Status for Badges
  const getAlertStatus = (dueDate?: string, completed?: boolean) => {
    if (!dueDate || completed) return null
    const today = getLocalTodayStr()
    if (dueDate === today) return "today"
    if (dueDate < today) return "overdue"
    return "upcoming"
  }

  // Metrics Calculations
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

  return (
    <main className="p-6 bg-slate-100 min-h-screen space-y-6 flex flex-col text-slate-950">
      
      {/* HEADER BUBBLE */}
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
          
          {/* Quick Metrics */}
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

          {/* Progress Bars */}
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
                    style={{ width: `${percentBudgetUsed}%` }} 
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
                    style={{ width: `${percentTimeUsed}%` }} 
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* PUNCH LIST & DELAYS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Punch List */}
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
                      <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${percentPunchCompleted}%` }} />
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
                    onKeyDown={(e) => e.key === "Enter" && handleAddPunchItem()}
                  />
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 px-4 shadow-sm" onClick={handleAddPunchItem}>
                    Add Task
                  </Button>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pt-2">
                  {punchList.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-3 text-center border border-dashed rounded">
                      No punch list items yet.
                    </p>
                  ) : (
                    punchList.map((item) => {
                      const alertStatus = getAlertStatus(item.dueDate, item.completed)

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
                              
                              {/* Sub-Text Details */}
                              {(!item.completed && (item.dueDate || item.assignedEmail)) && (
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  {item.dueDate && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                      alertStatus === "overdue" ? "bg-rose-100 text-rose-700 border border-rose-200" :
                                      alertStatus === "today" ? "bg-orange-100 text-orange-700 border border-orange-200" :
                                      "bg-slate-200 text-slate-600 border border-slate-300"
                                    }`}>
                                      {alertStatus === "overdue" && "⚠️ OVERDUE: "}
                                      {alertStatus === "today" && "🚨 DUE TODAY: "}
                                      {alertStatus === "upcoming" && "📅 Due: "}
                                      {formatDisplayDate(item.dueDate)}
                                    </span>
                                  )}
                                  {item.assignedEmail && (
                                    <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                      ✉️ {item.assignedEmail}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </label>

                          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                            <Button variant="outline" size="sm" onClick={() => setEditingPunch(item)} className="h-7 text-xs px-2 shadow-xs">
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

            {/* Flagged Delays */}
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
              <CardContent className="space-y-2">
                {customNonWorkdays.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center border-2 border-dashed rounded-md">
                    No non-workdays recorded.
                  </p>
                ) : (
                  customNonWorkdays.map((nonWorkday) => (
                    <div key={nonWorkday.date} className="p-2.5 bg-rose-50 border border-rose-200 rounded-md text-xs">
                      <div className="font-bold text-rose-900">{formatDisplayDate(nonWorkday.date)}</div>
                      <div className="text-rose-700 truncate mt-0.5">{nonWorkday.title || "Non-Workday"}</div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </Card>

      {/* EDIT / NOTIFY MODAL */}
      <Dialog open={!!editingPunch} onOpenChange={(open) => !open && setEditingPunch(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Task & Notifications</DialogTitle>
            <DialogDescription className="text-xs">Set due dates for alerts or assign an email to send a reminder.</DialogDescription>
          </DialogHeader>

          {editingPunch && (
            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-task" className="text-xs font-bold text-slate-700">Task Name</Label>
                <Input
                  id="edit-task"
                  value={editingPunch.text}
                  onChange={(e) => setEditingPunch({ ...editingPunch, text: e.target.value })}
                  className="text-sm shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-date" className="text-xs font-bold text-slate-700">Due Date (For Alerts)</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editingPunch.dueDate || ""}
                    onChange={(e) => setEditingPunch({ ...editingPunch, dueDate: e.target.value })}
                    className="text-sm shadow-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-email" className="text-xs font-bold text-slate-700">Vendor / Sub Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    placeholder="name@example.com"
                    value={editingPunch.assignedEmail || ""}
                    onChange={(e) => setEditingPunch({ ...editingPunch, assignedEmail: e.target.value })}
                    className="text-sm shadow-sm"
                  />
                </div>
              </div>

              {/* 1-CLICK EMAIL INTEGRATION */}
              <div className="pt-2 border-t mt-2">
                <Label className="text-xs font-bold text-slate-700 block mb-2">Actions</Label>
                {editingPunch.assignedEmail ? (
                  <a
                    href={`mailto:${editingPunch.assignedEmail}?subject=Project Task Reminder: ${editingPunch.text}&body=Hello,%0D%0A%0D%0APlease note the following task is required for the project:%0D%0A%0D%0ATask: ${editingPunch.text}%0D%0A${editingPunch.dueDate ? `Due Date: ${formatDisplayDate(editingPunch.dueDate)}%0D%0A` : ""}%0D%0AThank you!`}
                    className="flex w-full items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold h-10 rounded-md shadow-sm transition-colors"
                  >
                    ✉️ Open Email Draft to Vendor
                  </a>
                ) : (
                  <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-2 text-center italic">
                    Add an email address above to unlock the 1-click email reminder.
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPunch(null)}>Cancel</Button>
            <Button onClick={handleSavePunchEdit} className="bg-blue-600 hover:bg-blue-700 text-white">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version Tracker Footer */}
      <div className="w-full text-center py-6 text-xs text-slate-500 border-t border-slate-200 mt-8">
        CleanBuild v1.00
      </div>

    </main>
  )
}