"use client"

import { useState, useEffect } from "react"
import { get, set } from "idb-keyval"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Link from "next/link"

interface Expense {
  id: number
  materials: number
  labor: number
}

interface DailyLog {
  id: number
  date: string
  weather?: string
  isNonWorkday?: boolean
  nonWorkdayTitle?: string
  notes: string
  photos: string[]
}

interface PunchItem {
  id: number
  text: string
  completed: boolean
}

const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return ""
  const cleanDate = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr
  const [year, month, day] = cleanDate.split("-")
  if (!year || !month || !day) return dateStr
  return `${parseInt(month, 10)}/${parseInt(day, 10)}/${year.slice(-2)}`
}

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [totalBudget, setTotalBudget] = useState<number>(23402)
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [nonWorkdaysMap, setNonWorkdaysMap] = useState<Record<string, string>>({})
  
  // Punch List State
  const [punchList, setPunchList] = useState<PunchItem[]>([])
  const [newPunchText, setNewPunchText] = useState("")

  // Photo Gallery & Lightbox Cycling State
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)

  // Load real-time data from IndexedDB
  const loadDashboardData = async () => {
    try {
      const savedExpenses = await get<Expense[]>("builderlite_expenses")
      const savedBudget = await get<number>("builderlite_total_budget")
      const savedLogs = await get<DailyLog[]>("daily_logs_data")
      const savedNonWorkdays = await get<Record<string, string>>("non_workdays_map")
      const savedPunch = await get<PunchItem[]>("jobflow_punch_list")

      if (savedExpenses) setExpenses(savedExpenses)
      if (savedBudget !== undefined) setTotalBudget(savedBudget)
      if (savedLogs) setLogs(savedLogs)
      if (savedNonWorkdays) setNonWorkdaysMap(savedNonWorkdays)
      if (savedPunch) setPunchList(savedPunch)
    } catch (e) {
      console.error("Error loading dashboard data:", e)
    }
  }

  useEffect(() => {
    loadDashboardData()

    const handleSync = () => loadDashboardData()
    window.addEventListener("logs-updated", handleSync)
    window.addEventListener("expenses-updated", handleSync)

    return () => {
      window.removeEventListener("logs-updated", handleSync)
      window.removeEventListener("expenses-updated", handleSync)
    }
  }, [])

  // Punch List Logic
  const handleAddPunchItem = async () => {
    if (!newPunchText.trim()) return
    const updated = [...punchList, { id: Date.now(), text: newPunchText.trim(), completed: false }]
    setPunchList(updated)
    setNewPunchText("")
    await set("jobflow_punch_list", updated)
  }

  const handleTogglePunch = async (id: number) => {
    const updated = punchList.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    setPunchList(updated)
    await set("jobflow_punch_list", updated)
  }

  const handleDeletePunch = async (id: number) => {
    const updated = punchList.filter((item) => item.id !== id)
    setPunchList(updated)
    await set("jobflow_punch_list", updated)
  }

  // Punch List Counter Calculations
  const totalPunchItems = punchList.length
  const completedPunchItems = punchList.filter((item) => item.completed).length
  const percentPunchCompleted = totalPunchItems > 0 ? Math.round((completedPunchItems / totalPunchItems) * 100) : 0

  // Financial Calculations
  const totalMaterials = expenses.reduce((sum, item) => sum + (item.materials || 0), 0)
  const totalLabor = expenses.reduce((sum, item) => sum + (item.labor || 0), 0)
  const totalSpent = totalMaterials + totalLabor
  const remainingBudget = totalBudget - totalSpent
  const percentBudgetUsed = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0

  // Project Days Calculations (Dynamic to Current Date)
  const projStart = new Date("2026-06-29T00:00:00")
  const projEnd = new Date("2026-07-30T00:00:00")
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const totalTimeMs = projEnd.getTime() - projStart.getTime()
  const elapsedTimeMs = today.getTime() - projStart.getTime()
  const totalDays = Math.max(1, Math.round(totalTimeMs / (1000 * 60 * 60 * 24)) + 1)
  const currentDay = Math.min(totalDays, Math.max(1, Math.round(elapsedTimeMs / (1000 * 60 * 60 * 24)) + 1))
  const percentTimeUsed = Math.min(100, Math.max(0, Math.round((currentDay / totalDays) * 100)))

  const allPhotos = logs.flatMap((log) => log.photos || [])
  const recentLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)

  const handleNextPhoto = () => {
    if (selectedPhotoIndex === null || allPhotos.length === 0) return
    setSelectedPhotoIndex((prev) => (prev !== null && prev < allPhotos.length - 1 ? prev + 1 : 0))
  }

  const handlePrevPhoto = () => {
    if (selectedPhotoIndex === null || allPhotos.length === 0) return
    setSelectedPhotoIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : allPhotos.length - 1))
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedPhotoIndex === null) return
      if (e.key === "ArrowRight") handleNextPhoto()
      if (e.key === "ArrowLeft") handlePrevPhoto()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedPhotoIndex, allPhotos.length])

  return (
    <main className="p-6 bg-slate-100 min-h-screen space-y-6 flex flex-col text-slate-950">
      
      {/* LOCKED HEIGHT HEADER BUBBLE: Standardized to exactly md:h-[140px] */}
      <div className="bg-slate-900 text-white p-6 md:px-8 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:h-[140px] shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">📊 Dashboard</h1>
          </div>
          <p className="text-sm font-medium text-orange-400 mt-1.5 leading-relaxed max-w-2xl">
            Real-time site overview, active budget tracking, and job site management.
          </p>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {allPhotos.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-white border-slate-700 bg-slate-800/80 hover:bg-slate-700 hover:text-white h-10 text-xs font-semibold px-4 shadow-sm"
              onClick={() => setIsGalleryOpen(true)}
            >
              🖼️ Photo Gallery ({allPhotos.length})
            </Button>
          )}
        </div>
      </div>

      {/* Dashboard Main Card */}
      <Card className="overflow-hidden border shadow-sm bg-white flex-1">
        
        {/* Dashboard Content Body */}
        <div className="p-6 space-y-6">
          
          {/* Quick Metrics Grid */}
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
                  {Object.keys(nonWorkdaysMap).length} {Object.keys(nonWorkdaysMap).length === 1 ? "Day" : "Days"}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Progress Bars Grid */}
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
                <Progress value={percentBudgetUsed} className="h-3 bg-slate-100" />
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
                <Progress value={percentTimeUsed} className="h-3 bg-slate-100" />
              </CardContent>
            </Card>
          </div>

          {/* PUNCH LIST WIDGET & LOGGED DELAYS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Punch List / Site To-Do List */}
            <Card className="bg-white border shadow-2xs md:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm font-bold text-slate-900">✅ Site Punch List / To-Do's</CardTitle>
                  
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2.5 py-0.5 rounded">
                    {completedPunchItems} of {totalPunchItems} Completed ({percentPunchCompleted}%)
                  </span>
                </div>
                <CardDescription className="text-xs">Track quick daily tasks and micro-to-do items.</CardDescription>

                {totalPunchItems > 0 && (
                  <div className="pt-1">
                    <Progress value={percentPunchCompleted} className="h-1.5 bg-slate-100" />
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add to-do item (e.g. Return fittings, Call inspector)..."
                    value={newPunchText}
                    onChange={(e) => setNewPunchText(e.target.value)}
                    className="text-xs h-8"
                    onKeyDown={(e) => e.key === "Enter" && handleAddPunchItem()}
                  />
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3" onClick={handleAddPunchItem}>
                    Add
                  </Button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pt-1">
                  {punchList.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-3 text-center border border-dashed rounded">
                      No punch list items yet.
                    </p>
                  ) : (
                    punchList.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-slate-50 border rounded text-xs">
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => handleTogglePunch(item.id)}
                            className="h-4 w-4 accent-blue-600 rounded"
                          />
                          <span className={item.completed ? "line-through text-slate-400" : "text-slate-800 font-medium"}>
                            {item.text}
                          </span>
                        </label>
                        <button
                          onClick={() => handleDeletePunch(item.id)}
                          className="text-slate-400 hover:text-rose-600 text-xs px-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))
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
                <CardDescription className="text-xs">Days flagged as off from daily logs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.keys(nonWorkdaysMap).length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center border-2 border-dashed rounded-md">
                    No non-workdays recorded.
                  </p>
                ) : (
                  Object.entries(nonWorkdaysMap).map(([date, reason]) => (
                    <div key={date} className="p-2.5 bg-rose-50 border border-rose-200 rounded-md text-xs">
                      <div className="font-bold text-rose-900">{formatDisplayDate(date)}</div>
                      <div className="text-rose-700 truncate mt-0.5">{reason}</div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* RECENT LOGS */}
          <Card className="bg-white border shadow-2xs">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-bold text-slate-900">📋 Recent Daily Logs</CardTitle>
                <Link href="/logs" className="text-xs text-blue-600 hover:underline">
                  All Logs →
                </Link>
              </div>
              <CardDescription className="text-xs">Latest activity recorded on job site.</CardDescription>
            </CardHeader>
            <CardContent>
              {recentLogs.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-8 text-center border-2 border-dashed rounded-md">
                  No logs recorded yet.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          {formatDisplayDate(log.date)}
                        </span>
                        {log.weather && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-medium px-2 py-0.5 rounded">
                            ☀️ {log.weather}
                          </span>
                        )}
                        {log.isNonWorkday && (
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded">
                            🚫 Day Off
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">{log.notes}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </Card>

      {/* MODAL: PHOTO GALLERY GRID */}
      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent className="max-w-[90vw] md:max-w-4xl max-h-[85vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>🖼️ Project Photo Gallery ({allPhotos.length} Photos)</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 py-4">
            {allPhotos.map((photo, index) => (
              <img
                key={index}
                src={photo}
                alt={`Site photo ${index + 1}`}
                className="h-32 w-full object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setSelectedPhotoIndex(index)}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ENLARGED LIGHTBOX DIALOG WITH CYCLING CONTROLS */}
      <Dialog open={selectedPhotoIndex !== null} onOpenChange={() => setSelectedPhotoIndex(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl h-[85vh] p-4 bg-slate-950 text-white border-slate-800 flex flex-col justify-between">
          {selectedPhotoIndex !== null && allPhotos[selectedPhotoIndex] && (
            <>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-xs font-semibold text-slate-300">
                  🖼️ Site Photo {selectedPhotoIndex + 1} of {allPhotos.length}
                </span>
                <span className="text-[11px] text-slate-400">
                  Use ← / → keys or side arrows to cycle photos
                </span>
              </div>

              <div className="relative flex-1 flex items-center justify-center my-2 bg-black rounded-lg overflow-hidden">
                <img
                  src={allPhotos[selectedPhotoIndex]}
                  alt={`Enlarged site photo ${selectedPhotoIndex + 1}`}
                  className="max-h-[68vh] max-w-full object-contain"
                />

                {allPhotos.length > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevPhoto}
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white font-bold text-2xl flex items-center justify-center border border-slate-700 shadow-xl transition-transform hover:scale-110 active:scale-95"
                    title="Previous Photo (Left Arrow)"
                  >
                    ‹
                  </button>
                )}

                {allPhotos.length > 1 && (
                  <button
                    type="button"
                    onClick={handleNextPhoto}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white font-bold text-2xl flex items-center justify-center border border-slate-700 shadow-xl transition-transform hover:scale-110 active:scale-95"
                    title="Next Photo (Right Arrow)"
                  >
                    ›
                  </button>
                )}
              </div>

              <div className="flex justify-between items-center text-xs text-slate-400 pt-1 border-t border-slate-800">
                <span>Click outside or press ESC to close</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPhotoIndex(null)}
                  className="h-7 text-xs bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Version Tracker Footer */}
      <div className="w-full text-center py-6 text-xs text-slate-500 border-t border-slate-200 mt-8">
        CleanBuild v1.01
      </div>

    </main>
  )
}