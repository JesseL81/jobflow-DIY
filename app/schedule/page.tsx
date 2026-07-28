"use client"

import { useState, useMemo, useEffect } from "react"
import { get } from "idb-keyval"
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
  duration: number
  endDate: string
}

interface CustomNonWorkday {
  date: string
  title?: string
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
  { id: 1, title: "test example 1", color: "bg-amber-400", textColor: "text-slate-900", startDate: "2026-06-29", duration: 6, endDate: "2026-07-06" },
  { id: 2, title: "example 2", color: "bg-emerald-400", textColor: "text-slate-900", startDate: "2026-06-30", duration: 4, endDate: "2026-07-03" },
  { id: 3, title: "Dumpster Drop", color: "bg-rose-700", textColor: "text-white", startDate: "2026-07-06", duration: 1, endDate: "2026-07-06" },
  { id: 4, title: "Lumber Drop", color: "bg-rose-700", textColor: "text-white", startDate: "2026-07-06", duration: 1, endDate: "2026-07-06" },
  { id: 5, title: "Porta Potty", color: "bg-rose-700", textColor: "text-white", startDate: "2026-07-06", duration: 1, endDate: "2026-07-06" },
  { id: 6, title: "Mark Concrete to cut", color: "bg-teal-700", textColor: "text-white", startDate: "2026-07-06", duration: 1, endDate: "2026-07-06" },
  { id: 7, title: "Framing", color: "bg-rose-700", textColor: "text-white", startDate: "2026-07-08", duration: 3, endDate: "2026-07-10" },
  { id: 8, title: "Rough Mechanical", color: "bg-rose-700", textColor: "text-white", startDate: "2026-07-13", duration: 2, endDate: "2026-07-14" },
  { id: 9, title: "Rough Plumbing", color: "bg-sky-700", textColor: "text-white", startDate: "2026-07-15", duration: 2, endDate: "2026-07-16" },
  { id: 10, title: "Rough Electric 7/17", color: "bg-teal-700", textColor: "text-white", startDate: "2026-07-17", duration: 3, endDate: "2026-07-21" },
  { id: 11, title: "Drywall Stock", color: "bg-orange-500", textColor: "text-white", startDate: "2026-07-21", duration: 1, endDate: "2026-07-21" },
  { id: 12, title: "Rough Inspections", color: "bg-lime-500", textColor: "text-slate-900", startDate: "2026-07-24", duration: 1, endDate: "2026-07-24" },
  { id: 13, title: "Drywall", color: "bg-purple-900", textColor: "text-white", startDate: "2026-07-23", duration: 6, endDate: "2026-07-30" },
]

export default function SchedulePage() {
  // Navigation State (Anchored at July 2026)
  const todayAnchor = useMemo(() => new Date(2026, 6, 1), []) // July 2026
  const [currentDate, setCurrentDate] = useState<Date>(todayAnchor)

  const [selectedDate, setSelectedDate] = useState<string>("2026-07-01")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [taskDuration, setTaskDuration] = useState<string>("1")
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0])
  
  // Edit Task State
  const [editingTask, setEditingTask] = useState<CalendarTask | null>(null)

  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)

  // Custom non-workdays state & Independent Weekend Day Off Toggles
  const [customNonWorkdays, setCustomNonWorkdays] = useState<CustomNonWorkday[]>([])
  const [logNonWorkdays, setLogNonWorkdays] = useState<CustomNonWorkday[]>([])
  const [nonWorkdayTitle, setNonWorkdayTitle] = useState("")
  const [saturdaysOff, setSaturdaysOff] = useState<boolean>(true)
  const [sundaysOff, setSundaysOff] = useState<boolean>(true)
  const [isNonWorkdayToggle, setIsNonWorkdayToggle] = useState<boolean>(false)

  // Initial sample tasks state
  const [tasks, setTasks] = useState<CalendarTask[]>(INITIAL_TASKS)
  const [isLoaded, setIsLoaded] = useState(false)

  // --- LOCAL STORAGE PERSISTENCE: READ ON MOUNT ---
  useEffect(() => {
    const savedTasks = localStorage.getItem("jobflow_calendar_tasks")
    if (savedTasks) {
      try {
        const parsed = JSON.parse(savedTasks)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTasks(parsed)
        }
      } catch (e) {
        console.error("Error loading tasks from localStorage:", e)
      }
    }

    const savedNonWorkdays = localStorage.getItem("jobflow_custom_nonworkdays")
    if (savedNonWorkdays) {
      try {
        const parsed = JSON.parse(savedNonWorkdays)
        if (Array.isArray(parsed)) {
          setCustomNonWorkdays(parsed)
        }
      } catch (e) {
        console.error("Error loading non-workdays from localStorage:", e)
      }
    }

    const savedSatOff = localStorage.getItem("jobflow_saturdays_off")
    const savedSunOff = localStorage.getItem("jobflow_sundays_off")
    const savedWeekendsOff = localStorage.getItem("jobflow_weekends_off")

    if (savedSatOff !== null) {
      setSaturdaysOff(savedSatOff === "true")
    } else if (savedWeekendsOff !== null) {
      setSaturdaysOff(savedWeekendsOff === "true")
    }

    if (savedSunOff !== null) {
      setSundaysOff(savedSunOff === "true")
    } else if (savedWeekendsOff !== null) {
      setSundaysOff(savedWeekendsOff === "true")
    }

    setIsLoaded(true)
  }, [])

  // --- LOCAL STORAGE PERSISTENCE: SAVE ON CHANGE ---
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("jobflow_calendar_tasks", JSON.stringify(tasks))
    }
  }, [tasks, isLoaded])

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("jobflow_custom_nonworkdays", JSON.stringify(customNonWorkdays))
    }
  }, [customNonWorkdays, isLoaded])

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("jobflow_saturdays_off", String(saturdaysOff))
      localStorage.setItem("jobflow_sundays_off", String(sundaysOff))
    }
  }, [saturdaysOff, sundaysOff, isLoaded])

  // READ NON-WORKDAYS FROM INDEXEDDB & LISTEN FOR REAL-TIME LOG UPDATES
  const loadLogNonWorkdays = async () => {
    try {
      const map = await get<Record<string, string>>("non_workdays_map")
      if (map) {
        const formatted: CustomNonWorkday[] = Object.entries(map).map(([date, reason]) => ({
          date,
          title: reason ? `${reason}` : "Non-Workday (Log)",
        }))
        setLogNonWorkdays(formatted)
      } else {
        setLogNonWorkdays([])
      }
    } catch (e) {
      console.error("Error loading non-workdays from IndexedDB:", e)
    }
  }

  useEffect(() => {
    loadLogNonWorkdays()

    const handleSync = () => loadLogNonWorkdays()
    window.addEventListener("logs-updated", handleSync)
    return () => window.removeEventListener("logs-updated", handleSync)
  }, [])

  const allNonWorkdays = useMemo(() => {
    return [...customNonWorkdays, ...logNonWorkdays]
  }, [customNonWorkdays, logNonWorkdays])

  // Helper: Checks if a specific date string is a non-workday
  const isDateNonWorkdayCheck = (
    dateStr: string,
    nonWorkdaysList: CustomNonWorkday[],
    isSatOff: boolean,
    isSunOff: boolean
  ) => {
    const d = new Date(dateStr + "T00:00:00")
    const dayOfWeek = d.getDay()
    const isSat = dayOfWeek === 6
    const isSun = dayOfWeek === 0
    const isCustom = nonWorkdaysList.some((item) => item.date === dateStr)
    return isCustom || (isSatOff && isSat) || (isSunOff && isSun)
  }

  // Helper: Checks if date is a non-workday & returns its title
  const getNonWorkdayInfo = (dateStr: string) => {
    const foundCustom = allNonWorkdays.find((d) => d.date === dateStr)
    if (foundCustom) {
      return { isNonWorkday: true, title: foundCustom.title || "Non-workday" }
    }
    const d = new Date(dateStr + "T00:00:00")
    const dayOfWeek = d.getDay()
    if (saturdaysOff && dayOfWeek === 6) {
      return { isNonWorkday: true, title: "Saturday" }
    }
    if (sundaysOff && dayOfWeek === 0) {
      return { isNonWorkday: true, title: "Sunday" }
    }
    return { isNonWorkday: false, title: "" }
  }

  // Helper: Calculates task dates, pushing STRICTLY FORWARD past non-workdays
  const calculateTaskDates = (
    requestedStartDateStr: string,
    duration: number,
    nonWorkdaysList: CustomNonWorkday[],
    isSatOff: boolean,
    isSunOff: boolean
  ) => {
    let curr = new Date(requestedStartDateStr + "T00:00:00")

    while (isDateNonWorkdayCheck(curr.toISOString().split("T")[0], nonWorkdaysList, isSatOff, isSunOff)) {
      curr.setDate(curr.getDate() + 1)
    }

    const adjustedStartDateStr = curr.toISOString().split("T")[0]

    let workDaysCounted = 0
    let endDateStr = adjustedStartDateStr

    while (workDaysCounted < duration) {
      const dateStr = curr.toISOString().split("T")[0]
      if (!isDateNonWorkdayCheck(dateStr, nonWorkdaysList, isSatOff, isSunOff)) {
        workDaysCounted++
        endDateStr = dateStr
      }
      if (workDaysCounted === duration) break
      curr.setDate(curr.getDate() + 1)
    }

    return { startDate: adjustedStartDateStr, endDate: endDateStr }
  }

  useEffect(() => {
    if (!isLoaded) return
    setTasks((prevTasks) =>
      prevTasks.map((t) => {
        const { startDate, endDate } = calculateTaskDates(t.startDate, t.duration, allNonWorkdays, saturdaysOff, sundaysOff)
        return {
          ...t,
          startDate,
          endDate,
        }
      })
    )
  }, [allNonWorkdays, saturdaysOff, sundaysOff, isLoaded])

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

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

  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const handleTodayClick = () => {
    setCurrentDate(new Date(todayAnchor))
  }

  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [year, month] = e.target.value.split("-").map(Number)
    setCurrentDate(new Date(year, month, 1))
  }

  const handleOpenAddEventModal = () => {
    const defaultDateStr = "2026-07-01"
    setSelectedDate(defaultDateStr)
    setEditingTask(null)
    setNewTaskTitle("")
    setTaskDuration("1")
    const info = getNonWorkdayInfo(defaultDateStr)
    setIsNonWorkdayToggle(info.isNonWorkday)
    setNonWorkdayTitle(info.isNonWorkday && info.title !== "Saturday" && info.title !== "Sunday" ? info.title : "")
    setIsDialogOpen(true)
  }

  // Group 42 calendar days into 6 weekly rows of 7 days
  const calendarWeeks = useMemo(() => {
    const weeks = []
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstOfMonth = new Date(year, month, 1)
    const startingDayOfWeek = firstOfMonth.getDay()

    const startDate = new Date(firstOfMonth)
    startDate.setDate(firstOfMonth.getDate() - startingDayOfWeek)

    for (let w = 0; w < 6; w++) {
      const days = []
      for (let d = 0; d < 7; d++) {
        const current = new Date(startDate)
        current.setDate(startDate.getDate() + (w * 7 + d))

        const dateStr = current.toISOString().split("T")[0]
        const dayNum = current.getDate()
        const dayOfWeek = current.getDay()
        
        const { isNonWorkday, title: nonWorkdayTitle } = getNonWorkdayInfo(dateStr)
        const isToday = dateStr === "2026-07-23"

        days.push({ dateStr, dayNum, dayOfWeek, isNonWorkday, nonWorkdayTitle, isToday })
      }
      weeks.push(days)
    }
    return weeks
  }, [currentDate, allNonWorkdays, saturdaysOff, sundaysOff])

  const handleToggleSaturdaysOff = (enabled: boolean) => {
    setSaturdaysOff(enabled)
    const recalculatedTasks = tasks.map((t) => {
      const { startDate, endDate } = calculateTaskDates(t.startDate, t.duration, allNonWorkdays, enabled, sundaysOff)
      return {
        ...t,
        startDate,
        endDate,
      }
    })
    setTasks(recalculatedTasks)
  }

  const handleToggleSundaysOff = (enabled: boolean) => {
    setSundaysOff(enabled)
    const recalculatedTasks = tasks.map((t) => {
      const { startDate, endDate } = calculateTaskDates(t.startDate, t.duration, allNonWorkdays, saturdaysOff, enabled)
      return {
        ...t,
        startDate,
        endDate,
      }
    })
    setTasks(recalculatedTasks)
  }

  // Task row slots calculation: allow non-overlapping tasks to share slot 0
  const taskRowSlots = useMemo(() => {
    const slots: { [taskId: number]: number } = {}
    
    const sortedTasks = [...tasks].sort((a, b) => {
      if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate)
      return b.duration - a.duration
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
    if (dragOverDate !== dateStr) {
      setDragOverDate(dateStr)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverDate(null)
  }

  const handleDrop = (e: React.DragEvent, newStartDate: string) => {
    e.preventDefault()
    setDragOverDate(null)

    if (!draggedTaskId) return

    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id === draggedTaskId) {
          const { startDate, endDate } = calculateTaskDates(newStartDate, task.duration, allNonWorkdays, saturdaysOff, sundaysOff)
          return {
            ...task,
            startDate,
            endDate,
          }
        }
        return task
      })
    )

    setDraggedTaskId(null)
  }

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr)
    setEditingTask(null)
    setNewTaskTitle("")
    setTaskDuration("1")
    const info = getNonWorkdayInfo(dateStr)
    setIsNonWorkdayToggle(info.isNonWorkday)
    setNonWorkdayTitle(info.isNonWorkday && info.title !== "Saturday" && info.title !== "Sunday" ? info.title : "")
    setIsDialogOpen(true)
  }

  const handleTaskClick = (e: React.MouseEvent, task: CalendarTask) => {
    e.stopPropagation()
    setEditingTask(task)
    setSelectedDate(task.startDate)
    setNewTaskTitle(task.title)
    setTaskDuration(task.duration.toString())
    setSelectedColor(COLOR_PALETTE.find((c) => c.bg === task.color) || COLOR_PALETTE[0])
    const info = getNonWorkdayInfo(task.startDate)
    setIsNonWorkdayToggle(info.isNonWorkday)
    setNonWorkdayTitle(info.isNonWorkday && info.title !== "Saturday" && info.title !== "Sunday" ? info.title : "")
    setIsDialogOpen(true)
  }

  const handleSaveModal = () => {
    if (!selectedDate) return

    const parsedDuration = Math.max(1, parseInt(taskDuration) || 1)

    let updatedCustomNonWorkdays = [...customNonWorkdays]

    if (isNonWorkdayToggle) {
      const existingIndex = updatedCustomNonWorkdays.findIndex((d) => d.date === selectedDate)
      if (existingIndex >= 0) {
        updatedCustomNonWorkdays[existingIndex] = { date: selectedDate, title: nonWorkdayTitle.trim() }
      } else {
        updatedCustomNonWorkdays.push({ date: selectedDate, title: nonWorkdayTitle.trim() })
      }
    } else {
      updatedCustomNonWorkdays = updatedCustomNonWorkdays.filter((d) => d.date !== selectedDate)
    }
    setCustomNonWorkdays(updatedCustomNonWorkdays)

    const updatedCombinedNonWorkdays = [...updatedCustomNonWorkdays, ...logNonWorkdays]

    let updatedTasks = [...tasks]

    if (editingTask) {
      const { startDate, endDate } = calculateTaskDates(selectedDate, parsedDuration, updatedCombinedNonWorkdays, saturdaysOff, sundaysOff)
      updatedTasks = updatedTasks.map((t) =>
        t.id === editingTask.id
          ? {
              ...t,
              title: newTaskTitle.trim() || t.title,
              duration: parsedDuration,
              color: selectedColor.bg,
              textColor: selectedColor.text,
              startDate,
              endDate,
            }
          : t
      )
    } else if (newTaskTitle.trim().length > 0) {
      const { startDate, endDate } = calculateTaskDates(selectedDate, parsedDuration, updatedCombinedNonWorkdays, saturdaysOff, sundaysOff)

      updatedTasks.push({
        id: Date.now(),
        title: newTaskTitle,
        color: selectedColor.bg,
        textColor: selectedColor.text,
        startDate,
        duration: parsedDuration,
        endDate,
      })
    }

    const finalTasks = updatedTasks.map((t) => {
      const { startDate, endDate } = calculateTaskDates(t.startDate, t.duration, updatedCombinedNonWorkdays, saturdaysOff, sundaysOff)
      return {
        ...t,
        startDate,
        endDate,
      }
    })

    setTasks(finalTasks)
    setEditingTask(null)
    setNewTaskTitle("")
    setTaskDuration("1")
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
    <main className="p-6 bg-slate-100 min-h-screen space-y-6">
      {/* Calendar Grid Card */}
      <Card className="overflow-hidden border shadow-sm bg-white">
        
        {/* Navigation Banner */}
        <div className="bg-slate-900 text-white py-2.5 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTodayClick}
              className="text-white border-slate-700 bg-slate-800/80 hover:bg-slate-700 hover:text-white h-8 text-xs font-medium"
            >
              Today
            </Button>
            <Button
              size="sm"
              onClick={handleOpenAddEventModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs font-semibold px-3"
            >
              + Add Event
            </Button>
          </div>

          {/* Month Dropdown */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevMonth}
              className="h-8 w-8 p-0 font-bold text-slate-300 hover:text-white hover:bg-slate-800 text-lg"
              title="Previous Month"
            >
              ‹
            </Button>

            <div className="relative flex items-center">
              <select
                value={activeDropdownValue}
                onChange={handleDropdownChange}
                className="bg-transparent text-white font-bold text-base md:text-lg appearance-none text-center px-3 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-500 rounded hover:bg-slate-800/60 transition-colors"
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
              className="h-8 w-8 p-0 font-bold text-slate-300 hover:text-white hover:bg-slate-800 text-lg"
              title="Next Month"
            >
              ›
            </Button>
          </div>

          <span className="text-xs text-slate-400 hidden sm:inline">
            Drag tasks to reschedule
          </span>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 border-b text-center text-xs font-semibold text-slate-600 bg-slate-50 py-2">
          {daysOfWeek.map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        {/* Calendar Grid organized by Dynamic Scalable Week Rows */}
        <div className="bg-slate-200 gap-[1px] grid flex-col">
          {calendarWeeks.map((week, wIndex) => {
            const weekStart = week[0].dateStr
            const weekEnd = week[6].dateStr

            // Find tasks active during this week
            const weekTasks = tasks.filter((task) => {
              return !(task.endDate < weekStart || task.startDate > weekEnd)
            })

            // Calculate active contiguous segments for tasks, skipping non-workday days
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
                const isNonWork = isDateNonWorkdayCheck(day.dateStr, allNonWorkdays, saturdaysOff, sundaysOff)

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

            // Calculate maximum row slot used in this specific week to dynamically scale week row height
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
                            : "bg-white hover:bg-slate-50"
                      }`}
                      style={{ minHeight: `${dynamicWeekHeight}px` }}
                    >
                      {/* Date Header */}
                      <div className="flex justify-between items-start mb-1 px-1 pointer-events-none">
                        <span
                          className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                            day.isToday
                              ? "bg-blue-600 text-white font-bold"
                              : "text-slate-700"
                          }`}
                        >
                          {day.dayNum}
                        </span>
                        {day.isNonWorkday && (
                          <span className="text-[10px] text-slate-700 font-bold bg-slate-400/60 px-1.5 py-0.2 rounded truncate max-w-[100px]" title={day.nonWorkdayTitle}>
                            {day.nonWorkdayTitle}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Scalable Task Overlay Grid for Continuous Spanning Task Bars (Splits at Non-Workdays) */}
                <div
                  className="absolute left-0 right-0 top-7 bottom-1 px-1 pointer-events-none grid grid-cols-7 gap-y-1 gap-x-0 z-10"
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
                        className={`pointer-events-auto h-6 ${task.color} ${task.textColor || "text-white"} text-[11px] font-medium px-2 shadow-xs flex items-center overflow-hidden cursor-grab active:cursor-grabbing hover:brightness-110 transition-all mx-0.5 ${
                          isDraggingThis ? "opacity-40 scale-95" : "opacity-100"
                        } ${
                          seg.isTrueStart ? "rounded-l-md border-l-2 border-black/20" : "rounded-l-xs"
                        } ${
                          seg.isTrueEnd ? "rounded-r-md border-r-2 border-black/20" : "rounded-r-xs"
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

      {/* MODAL: TASK / DATE SETTINGS */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? `Edit Task: ${editingTask.title}` : "Date Options"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Separate Saturday & Sunday Schedule Rule Toggles */}
            <div className="p-3 bg-slate-50 rounded-lg border space-y-2">
              <Label className="font-semibold text-slate-800 block text-xs uppercase tracking-wider">
                Schedule Rules: Weekend Off Days
              </Label>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="flex items-center gap-2 bg-white p-2 rounded border cursor-pointer">
                  <input
                    id="saturdays-off-toggle"
                    type="checkbox"
                    checked={saturdaysOff}
                    onChange={(e) => handleToggleSaturdaysOff(e.target.checked)}
                    className="h-4 w-4 accent-indigo-600 rounded cursor-pointer"
                  />
                  <Label htmlFor="saturdays-off-toggle" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Saturdays Off
                  </Label>
                </div>

                <div className="flex items-center gap-2 bg-white p-2 rounded border cursor-pointer">
                  <input
                    id="sundays-off-toggle"
                    type="checkbox"
                    checked={sundaysOff}
                    onChange={(e) => handleToggleSundaysOff(e.target.checked)}
                    className="h-4 w-4 accent-indigo-600 rounded cursor-pointer"
                  />
                  <Label htmlFor="sundays-off-toggle" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Sundays Off
                  </Label>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 pt-0.5">Checked days will be automatically skipped when calculating work durations.</p>
            </div>

            {/* Custom Non-Workday Toggle & Title Input */}
            <div className="p-3 bg-slate-50 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="non-workday-mode" className="font-semibold text-slate-800 cursor-pointer">
                    Mark Specific Date as Non-Workday
                  </Label>
                  <p className="text-xs text-slate-500">Shades date gray and skips it during scheduling.</p>
                </div>
                <input
                  id="non-workday-mode"
                  type="checkbox"
                  checked={isNonWorkdayToggle}
                  onChange={(e) => setIsNonWorkdayToggle(e.target.checked)}
                  className="h-5 w-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              {isNonWorkdayToggle && (
                <div className="pt-2 border-t border-slate-200">
                  <Label htmlFor="non-workday-title" className="text-xs font-semibold text-slate-700">
                    Non-Workday Title / Reason (Optional)
                  </Label>
                  <Input
                    id="non-workday-title"
                    placeholder="e.g. 4th of July, Rain Day, Holiday"
                    value={nonWorkdayTitle}
                    onChange={(e) => setNonWorkdayTitle(e.target.value)}
                    className="mt-1 text-sm bg-white"
                  />
                </div>
              )}
            </div>

            <hr className="border-slate-200 my-1" />

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {editingTask ? "Update Task Details" : "Schedule New Task"}
              </h4>

              {/* Start Date Selector */}
              <div className="grid gap-2">
                <Label htmlFor="start-date-input">Start Date</Label>
                <Input
                  id="start-date-input"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="title">Task Name</Label>
                <Input
                  id="title"
                  placeholder="e.g. Electrical Rough-in"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
              </div>

              {/* Directly Editable Duration Input with Helper Explanations */}
              <div className="grid gap-2">
                <Label htmlFor="duration">Duration (Workdays)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="duration"
                    type="number"
                    min={1}
                    max={100}
                    value={taskDuration}
                    onChange={(e) => setTaskDuration(e.target.value)}
                    className="text-sm bg-white"
                  />
                  <div className="flex gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0 font-bold text-slate-700"
                      onClick={() => setTaskDuration((prev) => Math.max(1, (parseInt(prev) || 1) - 1).toString())}
                    >
                      -
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0 font-bold text-slate-700"
                      onClick={() => setTaskDuration((prev) => ((parseInt(prev) || 0) + 1).toString())}
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Inline Helper Description */}
                <p className="text-[11px] text-slate-500 leading-normal pt-0.5">
                  💡 Enter the total active workdays required for yourself or the hired tradesperson/contractor to finish this phase.
                </p>

                {/* Helpful Callout Box */}
                <div className="p-2.5 bg-blue-50/80 border border-blue-200/80 rounded-lg text-[11px] text-blue-900 leading-snug mt-1 flex items-start gap-2">
                  <span className="text-blue-600 text-xs shrink-0 mt-0.5">ℹ️</span>
                  <span>
                    <strong>Automatic Calendar Calculation:</strong> Non-workdays and weekend off days automatically shift the finish date forward on your calendar without reducing active trade work time.
                  </span>
                </div>
              </div>

              {/* 16-Color Palette Grid */}
              <div className="grid gap-2">
                <Label>Select Color</Label>
                <div className="grid grid-cols-8 gap-2 p-2.5 bg-slate-50 rounded-lg border">
                  {COLOR_PALETTE.map((color, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`h-7 w-7 rounded-md ${color.bg} flex items-center justify-center transition-transform hover:scale-110 ${
                        selectedColor.bg === color.bg ? "ring-2 ring-blue-600 ring-offset-1 scale-105" : ""
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

          <DialogFooter className="flex justify-between items-center sm:justify-between">
            {editingTask ? (
              <Button variant="destructive" size="sm" onClick={handleDeleteTask}>
                Delete Task
              </Button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSaveModal}>
                {editingTask ? "Update Task" : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}