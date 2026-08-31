"use client"

import { useState, useMemo, useEffect } from "react"
import { get } from "idb-keyval"
import { useOfflineSync } from "@/hooks/useOfflineSync"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface CalendarTask {
  id: number
  title: string
  color: string
  textColor?: string
  startDate: string
  endDate: string
}

interface CustomNonWorkday {
  date: string
  title?: string
  isFromLog?: boolean
}

// Helper to format local YYYY-MM-DD string accurately without timezone shifting
const getLocalTodayStr = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// 16-Color Palette
const COLOR_PALETTE = [
  { bg: "bg-amber-400", text: "text-slate-900", label: "Amber Yellow" },
  { bg: "bg-emerald-400", text: "text-slate-900", label: "Mint Green" },
  { bg: "bg-rose-700", text: "text-white", label: "Dark Red" },
  { bg: "bg-sky-700", text: "text-white", label: "Sky Blue" },
  { bg: "bg-indigo-700", text: "text-white", label: "Indigo" },
  { bg: "bg-purple-900", text: "text-white", label: "Deep Purple" },
  { bg: "bg-slate-700", text: "text-white", label: "Dark Slate" },
  { bg: "bg-pink-600", text: "text-white", label: "Vibrant Pink" },
  { bg: "bg-blue-600", text: "text-white", label: "Royal Blue" },
  { bg: "bg-cyan-500", text: "text-slate-900", label: "Cyan" },
  { bg: "bg-teal-700", text: "text-white", label: "Teal" },
  { bg: "bg-lime-500", text: "text-slate-900", label: "Lime Green" },
  { bg: "bg-orange-500", text: "text-white", label: "Bright Orange" },
  { bg: "bg-violet-600", text: "text-white", label: "Violet" },
  { bg: "bg-fuchsia-600", text: "text-white", label: "Fuchsia" },
  { bg: "bg-neutral-800", text: "text-white", label: "Charcoal" },
]

const INITIAL_TASKS: CalendarTask[] = [
  { id: 1, title: "👋 Drag me to another date!", color: "bg-blue-600", textColor: "text-white", startDate: "2026-08-28", endDate: "2026-08-29" },
  { id: 2, title: "Click me to edit colors & dates", color: "bg-amber-400", textColor: "text-slate-900", startDate: "2026-08-30", endDate: "2026-08-30" },
]

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const [selectedDate, setSelectedDate] = useState<string>(getLocalTodayStr())
  const [modalEndDate, setModalEndDate] = useState<string>(getLocalTodayStr())
  
  const [taskStartDate, setTaskStartDate] = useState<string>(getLocalTodayStr())
  const [taskEndDate, setTaskEndDate] = useState<string>(getLocalTodayStr())

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0])
  
  const [editingTask, setEditingTask] = useState<CalendarTask | null>(null)

  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  
  const [nonWorkdayTitle, setNonWorkdayTitle] = useState("")
  const [isNonWorkdayToggle, setIsNonWorkdayToggle] = useState<boolean>(false)

  // 1. Universal Auto-Sync Hooks (Replaces all custom load and cloud logic!)
  const [tasks, setTasks] = useOfflineSync<CalendarTask[]>("cleanbuild_calendar_tasks", INITIAL_TASKS)
  const [customNonWorkdays, setCustomNonWorkdays] = useOfflineSync<CustomNonWorkday[]>("cleanbuild_custom_nonworkdays", [])
  const [explicitWorkingDays, setExplicitWorkingDays] = useOfflineSync<string[]>("cleanbuild_explicit_working_days", [])
  const [saturdaysOff, setSaturdaysOff] = useOfflineSync<boolean>("cleanbuild_saturdays_off", true)
  const [sundaysOff, setSundaysOff] = useOfflineSync<boolean>("cleanbuild_sundays_off", true)
  const [nonWorkdaysMap, setNonWorkdaysMap] = useOfflineSync<Record<string, string>>("cleanbuild_non_workdays_map", {})

  // Keep Log Non-Workdays mapped if updated from another tab
  useEffect(() => {
    const handleSync = async () => {
      const map = await get<Record<string, string>>("cleanbuild_non_workdays_map")
      if (map) {
        setNonWorkdaysMap(map)
      }
    }
    window.addEventListener("logs-updated", handleSync)
    return () => window.removeEventListener("logs-updated", handleSync)
  }, [setNonWorkdaysMap])

  // Automatically parse the logs map into the array format the calendar needs
  const logNonWorkdays = useMemo(() => {
    return Object.entries(nonWorkdaysMap).map(([date, reason]) => ({
      date,
      title: reason ? `${reason}` : "Non-Workday (Log)",
      isFromLog: true,
    }))
  }, [nonWorkdaysMap])

  const allNonWorkdays = useMemo(() => {
    return [...customNonWorkdays, ...logNonWorkdays]
  }, [customNonWorkdays, logNonWorkdays])

  const isDateNonWorkdayCheck = (
    dateStr: string,
    nonWorkdaysList: CustomNonWorkday[],
    isSatOff: boolean,
    isSunOff: boolean,
    workingDaysList: string[]
  ) => {
    if (workingDaysList.includes(dateStr)) return false
    const d = new Date(dateStr + "T00:00:00")
    const dayOfWeek = d.getDay()
    const isSat = dayOfWeek === 6
    const isSun = dayOfWeek === 0
    const isCustom = nonWorkdaysList.some((item) => item.date === dateStr)
    return isCustom || (isSatOff && isSat) || (isSunOff && isSun)
  }

  const getNonWorkdayInfo = (dateStr: string) => {
    if (explicitWorkingDays.includes(dateStr)) {
      return { isNonWorkday: false, title: "", isFromLog: false }
    }
    const found = allNonWorkdays.find((d) => d.date === dateStr)
    if (found) {
      return { 
        isNonWorkday: true, 
        title: found.title || "Non-workday", 
        isFromLog: !!found.isFromLog 
      }
    }
    const d = new Date(dateStr + "T00:00:00")
    const dayOfWeek = d.getDay()
    if (saturdaysOff && dayOfWeek === 6) {
      return { isNonWorkday: true, title: "Saturday", isFromLog: false }
    }
    if (sundaysOff && dayOfWeek === 0) {
      return { isNonWorkday: true, title: "Sunday", isFromLog: false }
    }
    return { isNonWorkday: false, title: "", isFromLog: false }
  }

  const daysOfWeek = [
    { full: "Sunday", short: "Sun" },
    { full: "Monday", short: "Mon" },
    { full: "Tuesday", short: "Tue" },
    { full: "Wednesday", short: "Wed" },
    { full: "Thursday", short: "Thu" },
    { full: "Friday", short: "Fri" },
    { full: "Saturday", short: "Sat" },
  ]

  const monthOptions = useMemo(() => {
    const options = []
    for (let i = -3; i <= 3; i++) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1)
      const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      const value = `${d.getFullYear()}-${d.getMonth()}`
      options.push({ label, value, date: d })
    }
    return options
  }, [currentDate])

  const handlePrevMonth = () => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  const handleNextMonth = () => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  const handleTodayClick = () => {
    const now = new Date()
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1))
  }
  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [year, month] = e.target.value.split("-").map(Number)
    setCurrentDate(new Date(year, month, 1))
  }

  const handleOpenAddEventModal = () => {
    const defaultDateStr = getLocalTodayStr()
    setSelectedDate(defaultDateStr)
    setModalEndDate(defaultDateStr)
    setTaskStartDate(defaultDateStr)
    setTaskEndDate(defaultDateStr)
    setEditingTask(null)
    setNewTaskTitle("")
    const info = getNonWorkdayInfo(defaultDateStr)
    setIsNonWorkdayToggle(info.isNonWorkday)
    setNonWorkdayTitle(info.isNonWorkday && info.title !== "Saturday" && info.title !== "Sunday" ? info.title : "")
    setIsDialogOpen(true)
  }

  // Generate calendar weeks, tracking current month boundaries
  const calendarWeeks = useMemo(() => {
    const weeks = []
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const todayStr = getLocalTodayStr()

    const firstOfMonth = new Date(year, month, 1)
    const startingDayOfWeek = firstOfMonth.getDay()

    const startDate = new Date(firstOfMonth)
    startDate.setDate(firstOfMonth.getDate() - startingDayOfWeek)

    for (let w = 0; w < 6; w++) {
      const days = []
      for (let d = 0; d < 7; d++) {
        const current = new Date(startDate)
        current.setDate(startDate.getDate() + (w * 7 + d))

        const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`
        const dayNum = current.getDate()
        const dayOfWeek = current.getDay()
        
        const { isNonWorkday, title: nonWorkdayTitle, isFromLog } = getNonWorkdayInfo(dateStr)
        const isToday = dateStr === todayStr
        const isCurrentMonth = current.getMonth() === month
        const monthName = current.toLocaleDateString("en-US", { month: "short" })

        days.push({ dateStr, dayNum, dayOfWeek, isNonWorkday, nonWorkdayTitle, isFromLog, isToday, isCurrentMonth, monthName })
      }
      weeks.push(days)
    }
    return weeks
  }, [currentDate, allNonWorkdays, explicitWorkingDays, saturdaysOff, sundaysOff])

  const taskRowSlots = useMemo(() => {
    const slots: { [taskId: number]: number } = {}
    const sortedTasks = [...tasks].sort((a, b) => {
      if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate)
      return a.endDate.localeCompare(b.endDate)
    })

    sortedTasks.forEach((task) => {
      let slot = 0
      while (true) {
        const hasOverlap = sortedTasks.some((other) => {
          if (other.id === task.id || slots[other.id] === undefined || slots[other.id] !== slot) return false
          return !(task.endDate < other.startDate || task.startDate > other.endDate)
        })
        if (!hasOverlap) {
          slots[task.id] = slot
          break
        }
        slot++
      }
    })
    return slots
  }, [tasks])

  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.stopPropagation()
    setDraggedTaskId(taskId)
    e.dataTransfer.setData("text/plain", taskId.toString())
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    if (dragOverDate !== dateStr) setDragOverDate(dateStr)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverDate(null)
  }

  const handleDrop = (e: React.DragEvent, newDropDate: string) => {
    e.preventDefault()
    setDragOverDate(null)
    if (!draggedTaskId) return

    // Helper to check if a specific date string is a non-workday
    const isNonWork = (dStr: string) => 
      isDateNonWorkdayCheck(dStr, allNonWorkdays, saturdaysOff, sundaysOff, explicitWorkingDays)

    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id === draggedTaskId) {
          // 1. Find out how many WORKING days the original task took
          let workingDays = 0
          let currCountDate = new Date(task.startDate + "T00:00:00")
          const oldEnd = new Date(task.endDate + "T00:00:00")

          while (currCountDate <= oldEnd) {
            const dStr = currCountDate.toISOString().split("T")[0]
            if (!isNonWork(dStr)) workingDays++
            currCountDate.setDate(currCountDate.getDate() + 1)
          }

          if (workingDays === 0) workingDays = 1 // Safety fallback

          // 2. If dropped on a weekend/holiday, push the start date to the next available working day
          let newStart = new Date(newDropDate + "T00:00:00")
          while (isNonWork(newStart.toISOString().split("T")[0])) {
            newStart.setDate(newStart.getDate() + 1)
          }
          const finalStartStr = newStart.toISOString().split("T")[0]

          // 3. Add the working days to find the true end date
          let finalEndStr = finalStartStr
          let currAddDate = new Date(finalStartStr + "T00:00:00")
          let daysAdded = 1 // The start date itself counts as Day 1

          while (daysAdded < workingDays) {
            currAddDate.setDate(currAddDate.getDate() + 1)
            const dStr = currAddDate.toISOString().split("T")[0]
            
            if (!isNonWork(dStr)) {
              daysAdded++
              finalEndStr = dStr
            }
          }

          return {
            ...task,
            startDate: finalStartStr,
            endDate: finalEndStr,
          }
        }
        return task
      })
    )
    setDraggedTaskId(null)
  }

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr)
    setModalEndDate(dateStr)
    setTaskStartDate(dateStr)
    setTaskEndDate(dateStr)
    setEditingTask(null)
    setNewTaskTitle("")
    const info = getNonWorkdayInfo(dateStr)
    setIsNonWorkdayToggle(info.isNonWorkday)
    setNonWorkdayTitle(info.isNonWorkday && info.title !== "Saturday" && info.title !== "Sunday" ? info.title : "")
    setIsDialogOpen(true)
  }

  const handleTaskClick = (e: React.MouseEvent, task: CalendarTask) => {
    e.stopPropagation()
    setEditingTask(task)
    setSelectedDate(task.startDate)
    setModalEndDate(task.startDate)
    setTaskStartDate(task.startDate)
    setTaskEndDate(task.endDate)
    setNewTaskTitle(task.title)
    setSelectedColor(COLOR_PALETTE.find((c) => c.bg === task.color) || COLOR_PALETTE[0])
    const info = getNonWorkdayInfo(task.startDate)
    setIsNonWorkdayToggle(info.isNonWorkday)
    setNonWorkdayTitle(info.isNonWorkday && info.title !== "Saturday" && info.title !== "Sunday" ? info.title : "")
    setIsDialogOpen(true)
  }

  const handleSaveModal = async () => {
    if (!selectedDate) return

    let updatedCustomNonWorkdays = [...customNonWorkdays]
    let updatedExplicitWorkingDays = [...explicitWorkingDays]

    const start = new Date(selectedDate + "T00:00:00")
    const end = new Date((modalEndDate || selectedDate) + "T00:00:00")

    if (isNonWorkdayToggle) {
      let curr = new Date(start)
      while (curr <= end) {
        const dStr = curr.toISOString().split("T")[0]
        const titleVal = nonWorkdayTitle.trim() || "Non-workday"

        updatedExplicitWorkingDays = updatedExplicitWorkingDays.filter((d) => d !== dStr)

        const existingIndex = updatedCustomNonWorkdays.findIndex((d) => d.date === dStr)
        if (existingIndex >= 0) {
          updatedCustomNonWorkdays[existingIndex] = { date: dStr, title: titleVal }
        } else {
          updatedCustomNonWorkdays.push({ date: dStr, title: titleVal })
        }
        curr.setDate(curr.getDate() + 1)
      }
    } else {
      let curr = new Date(start)
      let currentLogMap: Record<string, string> = { ...nonWorkdaysMap }
      let logMapChanged = false

      while (curr <= end) {
        const dStr = curr.toISOString().split("T")[0]
        updatedCustomNonWorkdays = updatedCustomNonWorkdays.filter((d) => d.date !== dStr)

        const dObj = new Date(dStr + "T00:00:00")
        const dayOfWeek = dObj.getDay()
        const isDefaultWeekend = (saturdaysOff && dayOfWeek === 6) || (sundaysOff && dayOfWeek === 0)
        
        if (isDefaultWeekend && !updatedExplicitWorkingDays.includes(dStr)) {
          updatedExplicitWorkingDays.push(dStr)
        }

        if (currentLogMap[dStr]) {
          delete currentLogMap[dStr]
          logMapChanged = true
        }
        curr.setDate(curr.getDate() + 1)
      }

      if (logMapChanged) {
        setNonWorkdaysMap(currentLogMap)
        window.dispatchEvent(new Event("logs-updated"))
      }
    }

    setCustomNonWorkdays(updatedCustomNonWorkdays)
    setExplicitWorkingDays(updatedExplicitWorkingDays)

    let updatedTasks = [...tasks]
    if (editingTask) {
      const finalStart = taskStartDate || editingTask.startDate
      const finalEnd = taskEndDate >= finalStart ? taskEndDate : finalStart
      updatedTasks = updatedTasks.map((t) =>
        t.id === editingTask.id
          ? {
              ...t,
              title: newTaskTitle.trim() || t.title,
              color: selectedColor.bg,
              textColor: selectedColor.text,
              startDate: finalStart,
              endDate: finalEnd,
            }
          : t
      )
    } else if (newTaskTitle.trim().length > 0) {
      const finalStart = taskStartDate || selectedDate
      const finalEnd = taskEndDate >= finalStart ? taskEndDate : finalStart

      updatedTasks.push({
        id: Date.now(),
        title: newTaskTitle,
        color: selectedColor.bg,
        textColor: selectedColor.text,
        startDate: finalStart,
        endDate: finalEnd,
      })
    }

    setTasks(updatedTasks)
    setEditingTask(null)
    setNewTaskTitle("")
    setNonWorkdayTitle("")
    setIsDialogOpen(false)
  }

  const handleDeleteTask = () => {
    if (!editingTask) return
    setTasks(tasks.filter((t) => t.id !== editingTask.id))
    setIsDialogOpen(false)
    setEditingTask(null)
  }

  const activeDropdownValue = `${currentDate.getFullYear()}-${currentDate.getMonth()}`

  return (
    <main className="p-6 bg-slate-100 min-h-screen space-y-6 flex flex-col text-slate-950">
      
      {/* LOCKED HEIGHT HEADER BUBBLE */}
      <div className="bg-slate-900 text-white p-6 md:px-8 rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-3 items-center gap-4 mb-6 md:h-[140px] shrink-0">
        
        {/* Left Column */}
        <div className="flex flex-col justify-center">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            📅 Schedule
          </h1>
          <p className="text-sm font-medium text-orange-400 mt-1.5 leading-relaxed">
            Click a day or drag tasks to schedule.
          </p>
        </div>

        {/* Middle Column */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevMonth}
            className="h-10 w-10 p-0 font-bold text-slate-300 hover:text-white hover:bg-slate-800 text-xl"
            title="Previous Month"
          >
            ‹
          </Button>

          <div className="relative flex items-center">
            <select
              value={activeDropdownValue}
              onChange={handleDropdownChange}
              className="bg-transparent text-white font-bold text-base md:text-xl appearance-none text-center px-3 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-500 rounded hover:bg-slate-800/60 transition-colors"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="text-slate-400 text-xs pointer-events-none -ml-1">▼</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextMonth}
            className="h-10 w-10 p-0 font-bold text-slate-300 hover:text-white hover:bg-slate-800 text-xl"
            title="Next Month"
          >
            ›
          </Button>
        </div>

        {/* MOBILE CENTERED FIX APPLIED HERE */}
        {/* Right Column */}
        <div className="flex items-center justify-center md:justify-end w-full gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTodayClick}
            className="text-white border-slate-700 bg-slate-800/80 hover:bg-slate-700 hover:text-white h-10 text-xs font-semibold px-4 shadow-sm"
          >
            Today
          </Button>
          <Button
            size="sm"
            onClick={handleOpenAddEventModal}
            className="bg-blue-600 hover:bg-blue-700 text-white h-10 text-xs font-semibold px-4 shadow-sm"
          >
            + Add Event
          </Button>
        </div>

      </div>

      {/* Schedule Main Card Wrapper */}
      <Card className="overflow-hidden border shadow-sm bg-white flex-1 flex flex-col">
        
        {/* Days Header - Colored Orange to match Theme */}
        <div className="grid grid-cols-7 border-b text-center text-[11px] font-bold text-orange-600 uppercase tracking-wider bg-slate-50 py-2.5 shrink-0 shadow-sm z-10">
          {daysOfWeek.map((day) => (
            <div key={day.full}>
              {/* Shows full word on screens larger than mobile */}
              <span className="hidden sm:inline">{day.full}</span>
              {/* Shows 3-letter abbreviation on mobile screens */}
              <span className="sm:hidden">{day.short}</span>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="bg-slate-200 gap-[1px] grid flex-col flex-1">
          {calendarWeeks.map((week, wIndex) => {
            const weekStart = week[0].dateStr
            const weekEnd = week[6].dateStr

            const weekTasks = tasks.filter((task) => {
              return !(task.endDate < weekStart || task.startDate > weekEnd)
            })

            const taskSegments = weekTasks.flatMap((task) => {
              const segments: {
                task: CalendarTask
                startCol: number
                endCol: number
                isTrueStart: boolean
                isTrueEnd: boolean
              }[] = []

              let currentStartCol: number | null = null
              let currentEndCol: number | null = null

              week.forEach((day, idx) => {
                const dayCol = idx + 1
                const isTaskActive = day.dateStr >= task.startDate && day.dateStr <= task.endDate
                const isNonWork = isDateNonWorkdayCheck(day.dateStr, allNonWorkdays, saturdaysOff, sundaysOff, explicitWorkingDays)

                if (isTaskActive && !isNonWork) {
                  if (currentStartCol === null) {
                    currentStartCol = dayCol
                  }
                  currentEndCol = dayCol
                } else {
                  if (currentStartCol !== null && currentEndCol !== null) {
                    segments.push({
                      task,
                      startCol: currentStartCol,
                      endCol: currentEndCol,
                      isTrueStart: week[currentStartCol - 1].dateStr === task.startDate,
                      isTrueEnd: week[currentEndCol - 1].dateStr === task.endDate,
                    })
                    currentStartCol = null
                    currentEndCol = null
                  }
                }
              })

              if (currentStartCol !== null && currentEndCol !== null) {
                segments.push({
                  task,
                  startCol: currentStartCol,
                  endCol: currentEndCol,
                  isTrueStart: week[currentStartCol - 1].dateStr === task.startDate,
                  isTrueEnd: week[currentEndCol - 1].dateStr === task.endDate,
                })
              }

              return segments
            })

            const maxSlotInWeek = weekTasks.reduce(
              (max, task) => Math.max(max, taskRowSlots[task.id] ?? 0),
              -1
            )
            const dynamicWeekHeight = Math.max(80, (maxSlotInWeek + 1) * 28 + 36)

            return (
              <div
                key={wIndex}
                className="bg-slate-200 gap-[1px] grid grid-cols-7 relative transition-all"
                style={{ minHeight: `${dynamicWeekHeight}px` }}
              >
                {/* Background Day Cells */}
                {week.map((day) => {
                  const isBeingDraggedOver = dragOverDate === day.dateStr

                  return (
                    <div
                      key={day.dateStr}
                      onClick={() => handleDateClick(day.dateStr)}
                      onDragOver={(e) => handleDragOver(e, day.dateStr)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, day.dateStr)}
                      className={`p-1 pb-2 transition-all cursor-pointer flex flex-col justify-start h-full ${
                        isBeingDraggedOver
                          ? "bg-indigo-50/80 ring-2 ring-indigo-500 ring-inset"
                          : day.isNonWorkday 
                            ? "bg-slate-300 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:8px_8px]" 
                            : day.isCurrentMonth
                              ? "bg-white hover:bg-slate-50"
                              : "bg-slate-100 hover:bg-slate-200" // Grey background for non-current month
                      } ${!day.isCurrentMonth ? "opacity-50" : ""}`}
                      style={{ minHeight: `${dynamicWeekHeight}px` }}
                    >
                      {/* Date Header */}
                      <div className="flex justify-between items-start mb-1 px-1 pointer-events-none">
                        <span
                          className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                            day.isToday
                              ? "bg-blue-600 text-white font-bold"
                              : day.isCurrentMonth
                                ? "text-slate-700"
                                : "text-slate-500"
                          }`}
                        >
                          {day.dayNum === 1 ? `${day.monthName} ${day.dayNum}` : day.dayNum}
                        </span>
                        {day.isNonWorkday && (
                          <div className="flex items-center gap-1">
                            {day.isFromLog && (
                              <span className="text-[9px] font-bold text-white bg-blue-600 px-1 py-0.2 rounded-full shadow-xs" title="Synced from Daily Logs">
                                Log
                              </span>
                            )}
                            <span className="text-[10px] text-slate-700 font-bold bg-slate-400/60 px-1.5 py-0.2 rounded truncate max-w-[90px]" title={day.nonWorkdayTitle}>
                              {day.nonWorkdayTitle}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Task Overlay Grid */}
                <div
                  className="absolute left-1 right-1 top-7 bottom-1 pointer-events-none grid grid-cols-7 gap-y-1 gap-x-0 z-10"
                  style={{ minHeight: `${dynamicWeekHeight - 32}px` }}
                >
                  {taskSegments.map((seg, idx) => {
                    const task = seg.task
                    const slotRow = (taskRowSlots[task.id] ?? 0) + 1
                    const isDraggingThis = draggedTaskId === task.id

                    return (
                      <div
                        key={`${task.id}-${seg.startCol}-${idx}`}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={(e) => handleTaskClick(e, task)}
                        className={`pointer-events-auto h-6 ${task.color} ${task.textColor || "text-white"} text-[11px] font-medium px-2 shadow-xs flex items-center overflow-visible cursor-grab active:cursor-grabbing hover:brightness-110 transition-all ${
                          seg.startCol === 1 ? "ml-1.5" : "mx-0.5"
                        } ${
                          isDraggingThis ? "opacity-40 scale-95" : "opacity-100"
                        } ${
                          seg.isTrueStart ? "rounded-l-md border-l-2 border-black/30" : "rounded-l-xs"
                        } ${
                          seg.isTrueEnd ? "rounded-r-md border-r-2 border-black/30" : "rounded-r-xs"
                        }`}
                        style={{
                          gridColumnStart: seg.startCol,
                          gridColumnEnd: seg.endCol + 1,
                          gridRowStart: slotRow,
                        }}
                        title={`Drag to reschedule • Click to edit (${task.title})`}
                      >
                        <span className="truncate leading-none">{task.title}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* MODAL: DATE SETTINGS & STATUS */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[480px] max-h-[90vh] flex flex-col p-6">
          <DialogHeader className="pb-2 border-b shrink-0">
            <DialogTitle>
              {editingTask ? `Edit Task: ${editingTask.title}` : "Date Settings & Status"}
            </DialogTitle>
          </DialogHeader>

          {/* SCROLLABLE INNER BODY */}
          <div className="flex-1 overflow-y-auto space-y-5 py-3 pr-1">
            
            {/* GREY UPPER SECTION: Non-Workdays & Rules */}
            <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 space-y-4">
              
              {/* Weekend Schedule Rules */}
              <div className="space-y-2">
                <Label className="font-bold text-slate-500 block text-[10px] uppercase tracking-wider">
                  Global Weekend Rules
                </Label>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-300 transition-colors">
                    <input
                      id="saturdays-off-toggle"
                      type="checkbox"
                      checked={saturdaysOff}
                      onChange={(e) => setSaturdaysOff(e.target.checked)}
                      className="h-4 w-4 accent-indigo-600 rounded cursor-pointer"
                    />
                    <Label htmlFor="saturdays-off-toggle" className="text-xs font-semibold text-slate-700 cursor-pointer w-full">
                      Saturdays Off
                    </Label>
                  </div>

                  <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-300 transition-colors">
                    <input
                      id="sundays-off-toggle"
                      type="checkbox"
                      checked={sundaysOff}
                      onChange={(e) => setSundaysOff(e.target.checked)}
                      className="h-4 w-4 accent-indigo-600 rounded cursor-pointer"
                    />
                    <Label htmlFor="sundays-off-toggle" className="text-xs font-semibold text-slate-700 cursor-pointer w-full">
                      Sundays Off
                    </Label>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 pt-0.5 leading-relaxed">
                  These apply globally. To change a single weekend day, click it on the calendar to toggle its status manually.
                </p>
              </div>

              {/* Custom Non-Workday Toggle & Title Input with Multi-Day Range */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="non-workday-mode" className="font-bold text-slate-800 cursor-pointer text-sm">
                      Non-workday(s)
                    </Label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Shades date dark gray and skips it during scheduling.
                    </p>
                  </div>
                  <input
                    id="non-workday-mode"
                    type="checkbox"
                    checked={isNonWorkdayToggle}
                    onChange={(e) => setIsNonWorkdayToggle(e.target.checked)}
                    className="h-5 w-5 accent-orange-500 rounded cursor-pointer shadow-sm"
                  />
                </div>

                {isNonWorkdayToggle && (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="modal-start-date" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Start Date</Label>
                        <Input
                          id="modal-start-date"
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="mt-1 text-xs bg-white h-9 shadow-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="modal-end-date" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">End Date (Multi-Day)</Label>
                        <Input
                          id="modal-end-date"
                          type="date"
                          value={modalEndDate}
                          onChange={(e) => setModalEndDate(e.target.value)}
                          className="mt-1 text-xs bg-white h-9 shadow-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="non-workday-title" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Reason / Title (Optional)
                      </Label>
                      <Input
                        id="non-workday-title"
                        placeholder="e.g. 4th of July, Rain Day, Holiday"
                        value={nonWorkdayTitle}
                        onChange={(e) => setNonWorkdayTitle(e.target.value)}
                        className="mt-1 text-xs bg-white shadow-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* LOWER SECTION: Task Scheduling */}
            <div className="space-y-4 px-1">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {editingTask ? "Update Task Details" : "Schedule New Task"}
              </h4>
              
              <div className="grid gap-2">
                <Label htmlFor="title" className="text-xs font-semibold text-slate-700">Task Name</Label>
                <Input
                  id="title"
                  placeholder="e.g. Electrical Rough-in"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="shadow-sm"
                />
              </div>

              {/* Task Start and End Date Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label htmlFor="task-start-input" className="text-xs font-semibold text-slate-700">Task Start Date</Label>
                  <Input
                    id="task-start-input"
                    type="date"
                    value={taskStartDate}
                    onChange={(e) => setTaskStartDate(e.target.value)}
                    className="text-xs bg-white h-9 shadow-sm"
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="task-end-input" className="text-xs font-semibold text-slate-700">Task End Date</Label>
                  <Input
                    id="task-end-input"
                    type="date"
                    value={taskEndDate}
                    onChange={(e) => setTaskEndDate(e.target.value)}
                    className="text-xs bg-white h-9 shadow-sm"
                  />
                </div>
              </div>

              {/* 16-Color Palette Grid */}
              <div className="grid gap-2">
                <Label className="text-xs font-semibold text-slate-700">Select Timeline Color</Label>
                <div className="grid grid-cols-8 gap-2 p-2.5 bg-slate-50 rounded-lg border shadow-sm">
                  {COLOR_PALETTE.map((color, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`h-7 w-7 rounded-md ${color.bg} flex items-center justify-center transition-transform hover:scale-110 ${
                        selectedColor.bg === color.bg ? "ring-2 ring-blue-600 ring-offset-1 scale-105 shadow-md" : "shadow-xs"
                      }`}
                      title={color.label}
                    >
                      {selectedColor.bg === color.bg && (
                        <span className={`text-xs ${color.text}`}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* FIXED ALWAYS-VISIBLE FOOTER */}
          <DialogFooter className="pt-3 border-t shrink-0 flex justify-between items-center sm:justify-between">
            {editingTask ? (
              <Button variant="destructive" size="sm" onClick={handleDeleteTask} className="shadow-sm">
                Delete Task
              </Button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="shadow-sm">
                Cancel
              </Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" onClick={handleSaveModal}>
                {editingTask ? "Update Task" : "Save Changes"}
              </Button>
            </div>
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