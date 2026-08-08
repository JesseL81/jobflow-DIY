"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface TemplateTask {
  title: string
  duration: number
  color: string
  textColor: string
  phase: string
  sameDayAsPrevious?: boolean
}

interface ProjectTemplate {
  id: string
  name: string
  description: string
  estimatedWorkdays: number
  category: string
  icon: string
  tasks: TemplateTask[]
}

const TEMPLATES: ProjectTemplate[] = [
  {
    id: "basement-finish",
    name: "Full Basement Finish",
    description: "Complete basement buildout sequence including framing, mechanicals, drywall, trim, paint, final inspection, carpet, and site cleaning.",
    estimatedWorkdays: 35,
    category: "Residential Remodel",
    icon: "🏠",
    tasks: [
      { title: "Framing", duration: 3, color: "bg-rose-700", textColor: "text-white", phase: "Framing" },
      { title: "HVAC", duration: 1, color: "bg-orange-500", textColor: "text-white", phase: "Rough Mechanical" },
      { title: "Plumbing", duration: 1, color: "bg-sky-700", textColor: "text-white", phase: "Rough Mechanical" },
      { title: "Electric", duration: 2, color: "bg-teal-700", textColor: "text-white", phase: "Rough Mechanical" },
      { title: "Fire Draft Stopping", duration: 1, color: "bg-red-600", textColor: "text-white", phase: "Rough Mechanical" },
      { title: "Rough Inspections", duration: 1, color: "bg-lime-500", textColor: "text-slate-900", phase: "Inspections" },
      { title: "Insulation", duration: 1, color: "bg-amber-400", textColor: "text-slate-900", phase: "Insulation" },
      { title: "Insulation Inspection", duration: 1, color: "bg-lime-500", textColor: "text-slate-900", phase: "Inspections" },
      { title: "Drywall", duration: 5, color: "bg-purple-900", textColor: "text-white", phase: "Drywall" },
      { title: "Tile Install", duration: 5, color: "bg-cyan-500", textColor: "text-slate-900", phase: "Finishes" },
      { title: "Millwork", duration: 3, color: "bg-indigo-700", textColor: "text-white", phase: "Finishes" },
      { title: "Paint", duration: 5, color: "bg-fuchsia-600", textColor: "text-white", phase: "Finishes" },
      { title: "Electric Trim", duration: 1, color: "bg-teal-700", textColor: "text-white", phase: "Trim Out" },
      { title: "HVAC Trim", duration: 1, color: "bg-orange-500", textColor: "text-white", phase: "Trim Out" },
      { title: "Plumbing Trim", duration: 1, color: "bg-sky-700", textColor: "text-white", phase: "Trim Out", sameDayAsPrevious: true },
      { title: "Final Inspection", duration: 1, color: "bg-emerald-600", textColor: "text-white", phase: "Inspections" },
      { title: "Carpet Install", duration: 2, color: "bg-blue-600", textColor: "text-white", phase: "Flooring" },
      { title: "Cleaning", duration: 1, color: "bg-amber-500", textColor: "text-white", phase: "Final Cleanup" },
    ],
  },
  {
    id: "bathroom-remodel",
    name: "Full Bathroom Remodel",
    description: "Complete bathroom remodel sequence including demo, plumbing & electric roughs, inspections, drywall, tile, millwork, paint, trim outs, and final inspection.",
    estimatedWorkdays: 17,
    category: "Bathroom",
    icon: "🛁",
    tasks: [
      { title: "Demo", duration: 2, color: "bg-neutral-800", textColor: "text-white", phase: "Demolition" },
      { title: "Plumbing", duration: 1, color: "bg-sky-700", textColor: "text-white", phase: "Rough Mechanical" },
      { title: "Electric", duration: 1, color: "bg-teal-700", textColor: "text-white", phase: "Rough Mechanical" },
      { title: "Inspection", duration: 1, color: "bg-lime-500", textColor: "text-slate-900", phase: "Inspections" },
      { title: "Drywall", duration: 1, color: "bg-purple-900", textColor: "text-white", phase: "Drywall" },
      { title: "Tile Install", duration: 5, color: "bg-cyan-500", textColor: "text-slate-900", phase: "Tile Work" },
      { title: "Millwork", duration: 1, color: "bg-indigo-700", textColor: "text-white", phase: "Finishes" },
      { title: "Paint", duration: 2, color: "bg-fuchsia-600", textColor: "text-white", phase: "Finishes" },
      { title: "Electric Trim", duration: 1, color: "bg-teal-700", textColor: "text-white", phase: "Trim Out" },
      { title: "Plumbing Trim", duration: 1, color: "bg-sky-700", textColor: "text-white", phase: "Trim Out" },
      { title: "Final Inspection", duration: 1, color: "bg-emerald-600", textColor: "text-white", phase: "Inspections" },
    ],
  },
]

export default function TemplatesPage() {
  const router = useRouter()
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("basement-finish")
  const [startDate, setStartDate] = useState<string>("2026-08-03")
  const [isImporting, setIsImporting] = useState<boolean>(false)

  const activeTemplate = TEMPLATES.find((t) => t.id === selectedTemplateId) || TEMPLATES[0]

  // Read non-workday rules (Saturdays Off, Sundays Off, and Custom Non-Workdays)
  const nonWorkdayCheck = useMemo(() => {
    let saturdaysOff = true
    let sundaysOff = true
    let customNonWorkdays: string[] = []

    if (typeof window !== "undefined") {
      const savedSat = localStorage.getItem("jobflow_saturdays_off")
      const savedSun = localStorage.getItem("jobflow_sundays_off")
      const savedWeekends = localStorage.getItem("jobflow_weekends_off")

      if (savedSat !== null) saturdaysOff = savedSat === "true"
      else if (savedWeekends !== null) saturdaysOff = savedWeekends === "true"

      if (savedSun !== null) sundaysOff = savedSun === "true"
      else if (savedWeekends !== null) sundaysOff = savedWeekends === "true"

      try {
        const savedCustom = localStorage.getItem("jobflow_custom_nonworkdays")
        if (savedCustom) {
          const parsed = JSON.parse(savedCustom)
          if (Array.isArray(parsed)) {
            customNonWorkdays = parsed.map((d: { date: string }) => d.date)
          }
        }
      } catch (e) {
        console.error("Error reading custom non-workdays", e)
      }
    }

    return (dateStr: string) => {
      const d = new Date(dateStr + "T00:00:00")
      const dayOfWeek = d.getDay()
      const isSat = dayOfWeek === 6
      const isSun = dayOfWeek === 0
      return customNonWorkdays.includes(dateStr) || (saturdaysOff && isSat) || (sundaysOff && isSun)
    }
  }, [])

  // Calculate scheduled dates for preview calendar with proper sequential day advancement
  const scheduledTemplateTasks = useMemo(() => {
    let current = new Date((startDate || "2026-08-03") + "T00:00:00")
    let previousTaskStartDateStr = ""
    let previousSequentialEndDate = new Date((startDate || "2026-08-03") + "T00:00:00")

    return activeTemplate.tasks.map((task, index) => {
      if (task.sameDayAsPrevious && previousTaskStartDateStr) {
        current = new Date(previousTaskStartDateStr + "T00:00:00")
      } else if (index > 0) {
        current = new Date(previousSequentialEndDate)
        current.setDate(current.getDate() + 1)
        while (nonWorkdayCheck(current.toISOString().split("T")[0])) {
          current.setDate(current.getDate() + 1)
        }
      } else {
        while (nonWorkdayCheck(current.toISOString().split("T")[0])) {
          current.setDate(current.getDate() + 1)
        }
      }

      const taskStartDateStr = current.toISOString().split("T")[0]
      if (!task.sameDayAsPrevious) {
        previousTaskStartDateStr = taskStartDateStr
      }

      let workDaysCounted = 0
      let taskEndDateStr = taskStartDateStr

      let calcCurr = new Date(current)
      while (workDaysCounted < task.duration) {
        const dateStr = calcCurr.toISOString().split("T")[0]
        if (!nonWorkdayCheck(dateStr)) {
          workDaysCounted++
          taskEndDateStr = dateStr
        }
        if (workDaysCounted === task.duration) break
        calcCurr.setDate(calcCurr.getDate() + 1)
      }

      if (!task.sameDayAsPrevious) {
        previousSequentialEndDate = new Date(taskEndDateStr + "T00:00:00")
      }

      return {
        id: index + 1,
        title: task.title,
        color: task.color,
        textColor: task.textColor,
        startDate: taskStartDateStr,
        endDate: taskEndDateStr,
        duration: task.duration,
      }
    })
  }, [activeTemplate, startDate, nonWorkdayCheck])

  // Dynamic Calendar Weeks: Extends automatically to fit all schedule milestones
  const calendarWeeks = useMemo(() => {
    const weeks = []
    const anchor = new Date((startDate || "2026-08-03") + "T00:00:00")
    
    let maxEndDate = new Date(anchor)
    scheduledTemplateTasks.forEach((task) => {
      const taskEnd = new Date(task.endDate + "T00:00:00")
      if (taskEnd > maxEndDate) maxEndDate = taskEnd
    })

    const startSunday = new Date(anchor)
    startSunday.setDate(anchor.getDate() - anchor.getDay())

    const diffDays = Math.ceil((maxEndDate.getTime() - startSunday.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const totalWeeksNeeded = Math.max(4, Math.ceil(diffDays / 7))

    for (let w = 0; w < totalWeeksNeeded; w++) {
      const days = []
      for (let d = 0; d < 7; d++) {
        const current = new Date(startSunday)
        current.setDate(startSunday.getDate() + (w * 7 + d))

        const dateStr = current.toISOString().split("T")[0]
        const dayNum = current.getDate()
        const dayOfWeek = current.getDay()
        const isNonWork = nonWorkdayCheck(dateStr)

        days.push({ dateStr, dayNum, dayOfWeek, isNonWork })
      }
      weeks.push(days)
    }
    return weeks
  }, [startDate, scheduledTemplateTasks, nonWorkdayCheck])

  // Consolidation slot calculation: allow non-overlapping tasks to share slot rows
  const taskRowSlots = useMemo(() => {
    const slots: { [taskId: number]: number } = {}
    
    scheduledTemplateTasks.forEach((task) => {
      let slot = 0
      while (true) {
        const hasOverlap = scheduledTemplateTasks.some((other) => {
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
  }, [scheduledTemplateTasks])

  // Import Handler
  const handleImportToSchedule = () => {
    setIsImporting(true)

    const newTasksToImport = scheduledTemplateTasks.map((task, index) => ({
      id: Date.now() + index,
      title: task.title,
      color: task.color,
      textColor: task.textColor,
      startDate: task.startDate,
      duration: task.duration,
      endDate: task.endDate,
    }))

    let existingTasks = []
    try {
      const savedSchedule = localStorage.getItem("jobflow_calendar_tasks")
      if (savedSchedule) {
        const parsed = JSON.parse(savedSchedule)
        if (Array.isArray(parsed)) {
          existingTasks = parsed
        }
      }
    } catch (e) {
      console.error("Error loading existing tasks", e)
    }

    const updatedTasks = [...existingTasks, ...newTasksToImport]
    localStorage.setItem("jobflow_calendar_tasks", JSON.stringify(updatedTasks))

    setTimeout(() => {
      setIsImporting(false)
      router.push("/schedule")
    }, 400)
  }

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <main className="p-6 bg-slate-100 min-h-screen space-y-6 flex flex-col text-slate-950">
      
      {/* LOCKED HEIGHT HEADER BUBBLE: Standardized to exactly md:h-[140px] so it matches perfectly across all tabs */}
      <div className="bg-slate-900 text-white p-6 md:px-8 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:h-[140px]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">📋 Project Templates</h1>
          </div>
          <p className="text-sm font-medium text-orange-400 mt-1.5 leading-relaxed max-w-2xl">
            Select a project template below, pick a start date, and preview how the sequential schedule will look on your calendar.
          </p>
        </div>

        {/* Start Date & Import Control styled for dark background */}
        {/* MOBILE CENTERED FIX APPLIED HERE */}
        <div className="flex items-center justify-center w-full md:w-auto gap-3 shrink-0">
          <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700 flex items-end justify-center w-full md:w-auto gap-3">
            <div>
              <Label htmlFor="start-date" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Project Start Date
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-900 text-white text-xs h-8 border-slate-600 focus:border-blue-500 w-full"
              />
            </div>
            <Button
              onClick={handleImportToSchedule}
              disabled={isImporting}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-8 px-4 shadow-xs"
            >
              {isImporting ? "Importing..." : "🚀 Import to Schedule"}
            </Button>
          </div>
        </div>
      </div>

      {/* TOP SECTION: Horizontal Template Options */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
          Select Template ({TEMPLATES.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TEMPLATES.map((tmpl) => {
            const isActive = tmpl.id === selectedTemplateId

            return (
              <button
                key={tmpl.id}
                onClick={() => setSelectedTemplateId(tmpl.id)}
                className={`text-left p-5 rounded-xl border transition-all ${
                  isActive
                    ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-blue-500/50"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{tmpl.icon}</span>
                    <span className="text-base font-bold leading-tight">{tmpl.name}</span>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] font-semibold ${
                      isActive ? "bg-blue-500/20 text-blue-300 border border-blue-400/30" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {tmpl.category}
                  </Badge>
                </div>
                <p className={`text-xs leading-relaxed mb-3 ${isActive ? "text-slate-300" : "text-slate-500"}`}>
                  {tmpl.description}
                </p>
                <div className="flex items-center justify-between border-t pt-2.5 border-slate-700/40 text-xs">
                  <span className={`font-semibold ${isActive ? "text-blue-400" : "text-slate-700"}`}>
                    ⏱️ {tmpl.estimatedWorkdays} Workdays ({tmpl.tasks.length} Milestones)
                  </span>
                  <span className={`font-bold ${isActive ? "text-white" : "text-slate-400"}`}>
                    {isActive ? "Selected ✓" : "Click to Select"}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* BOTTOM SECTION: Preview Calendar */}
      <section className="space-y-3 flex-1">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Schedule Preview Calendar — {activeTemplate.name} ({calendarWeeks.length} Weeks)
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Visual preview of calculated start & finish dates
          </span>
        </div>

        <Card className="overflow-hidden border shadow-sm bg-white">
          {/* Days Header */}
          <div className="grid grid-cols-7 border-b text-center text-xs font-semibold text-slate-600 bg-slate-50 py-2">
            {daysOfWeek.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {/* Calendar Grid organized by Dynamic Week Rows */}
          <div className="bg-slate-200 gap-[1px] grid flex-col">
            {calendarWeeks.map((week, wIndex) => {
              const weekStart = week[0].dateStr
              const weekEnd = week[6].dateStr

              // Find tasks active during this week
              const weekTasks = scheduledTemplateTasks.filter((task) => {
                return !(task.endDate < weekStart || task.startDate > weekEnd)
              })

              // Calculate active contiguous segments for tasks, skipping non-workdays
              const taskSegments = weekTasks.flatMap((task) => {
                const segments: {
                  task: typeof task
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

                  if (isTaskActive && !day.isNonWork) {
                    if (currentStartCol === null) currentStartCol = dayCol
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

              // Dynamic row height calculation
              const maxSlotInWeek = weekTasks.reduce((max, task) => Math.max(max, taskRowSlots[task.id] ?? 0), -1)
              const dynamicWeekHeight = Math.max(80, (maxSlotInWeek + 1) * 26 + 32)

              return (
                <div
                  key={wIndex}
                  className="bg-slate-200 gap-[1px] grid grid-cols-7 relative transition-all"
                  style={{ minHeight: `${dynamicWeekHeight}px` }}
                >
                  {/* Background Day Cells */}
                  {week.map((day) => (
                    <div
                      key={day.dateStr}
                      className={`p-1 pb-2 flex flex-col justify-start h-full ${
                        day.isNonWork
                          ? "bg-slate-300 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:8px_8px]"
                          : "bg-white"
                      }`}
                      style={{ minHeight: `${dynamicWeekHeight}px` }}
                    >
                      <div className="flex justify-between items-start mb-1 px-1">
                        <span
                          className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                            day.dateStr === startDate ? "bg-blue-600 text-white font-bold" : "text-slate-700"
                          }`}
                        >
                          {day.dayNum}
                        </span>
                        {day.isNonWork && (
                          <span className="text-[9px] text-slate-500 font-bold uppercase">Off</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Task Overlay Grid */}
                  <div
                    className="absolute left-0 right-0 top-7 bottom-1 px-1 pointer-events-none grid grid-cols-7 gap-y-1 gap-x-0 z-10"
                    style={{ minHeight: `${dynamicWeekHeight - 28}px` }}
                  >
                    {taskSegments.map((seg, idx) => {
                      const task = seg.task
                      const slotRow = (taskRowSlots[task.id] ?? 0) + 1

                      return (
                        <div
                          key={`${task.id}-${seg.startCol}-${idx}`}
                          className={`pointer-events-auto h-5 ${task.color} ${task.textColor} text-[10px] font-semibold px-2 shadow-xs flex items-center overflow-hidden truncate transition-all mx-0.5 ${
                            seg.isTrueStart ? "rounded-l-md border-l-2 border-black/20" : "rounded-l-xs"
                          } ${
                            seg.isTrueEnd ? "rounded-r-md border-r-2 border-black/20" : "rounded-r-xs"
                          }`}
                          style={{
                            gridColumnStart: seg.startCol,
                            gridColumnEnd: seg.endCol + 1,
                            gridRowStart: slotRow,
                          }}
                          title={`${task.title} (${task.startDate} to ${task.endDate})`}
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
      </section>

      {/* Version Tracker Footer */}
      <div className="w-full text-center py-6 text-xs text-slate-500 border-t border-slate-200 mt-8">
        CleanBuild v1.06
      </div>
      
    </main>
  )
}