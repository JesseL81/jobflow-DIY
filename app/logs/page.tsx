"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { get, set } from "idb-keyval"
import { syncManager } from "@/lib/syncManager"
import html2canvas from "html2canvas-pro"
import jsPDF from "jspdf"
import JSZip from "jszip"
import { saveAs } from "file-saver"

interface DailyLog {
  id: number
  date: string // Stored as YYYY-MM-DD
  weather?: string
  isNonWorkday?: boolean
  nonWorkdayTitle?: string
  notes: string
  photos: string[]
}

const INITIAL_LOGS: DailyLog[] = [
  {
    id: 1,
    date: "2026-07-22",
    weather: "Sunny, 85°F",
    isNonWorkday: false,
    nonWorkdayTitle: "",
    notes: "Completed concrete pour for the front walkway. Framing material delivered and staged near garage.",
    photos: [
      "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?w=800&auto=format&fit=crop&q=80",
    ],
  },
  {
    id: 2,
    date: "2026-07-21",
    weather: "Thunderstorm, 68°F",
    isNonWorkday: true,
    nonWorkdayTitle: "Weather Delay - Flood",
    notes: "Heavy rain all day. Site flooded, unable to perform exterior framing or pour concrete.",
    photos: [],
  },
]

const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return ""
  const cleanDate = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr
  const [year, month, day] = cleanDate.split("-")
  if (!year || !month || !day) return dateStr
  return `${parseInt(month, 10)}/${parseInt(day, 10)}/${year.slice(-2)}`
}

const getTodayInputDate = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export default function DailyLogsPage() {
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [projectName, setProjectName] = useState("My Project")
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null)

  // Form State
  const [logDate, setLogDate] = useState("")
  const [logWeather, setLogWeather] = useState("")
  const [isFetchingWeather, setIsFetchingWeather] = useState(false)
  const [isNonWorkday, setIsNonWorkday] = useState(false)
  const [nonWorkdayTitle, setNonWorkdayTitle] = useState("")
  const [logNotes, setLogNotes] = useState("")
  const [logPhotos, setLogPhotos] = useState<string[]>([])

  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState("")

  // Export DOM Reference
  const exportCardRef = useRef<HTMLDivElement>(null)
  const [exportLogTarget, setExportLogTarget] = useState<DailyLog | null>(null)

  // Load logs and project name from IndexedDB/LocalStorage
  useEffect(() => {
    async function loadLogs() {
      try {
        const savedLogs = await get<DailyLog[]>("daily_logs_data")
        if (savedLogs && Array.isArray(savedLogs) && savedLogs.length > 0) {
          setLogs(savedLogs)
        } else {
          setLogs(INITIAL_LOGS)
          await saveAndSyncLogs(INITIAL_LOGS)
        }
        
        const cloudLogs = await syncManager.pullFromCloud("daily_logs_data")
        if (cloudLogs) {
          setLogs(cloudLogs)
        }
      } catch (e) {
        console.error("Error loading logs from IndexedDB:", e)
        setLogs(INITIAL_LOGS)
      }
    }
    loadLogs()

    const loadProjectName = () => {
      const savedName = localStorage.getItem("cleanbuild_project_name")
      if (savedName) setProjectName(savedName)
    }
    loadProjectName()
    
    window.addEventListener("project-name-updated", loadProjectName)
    return () => window.removeEventListener("project-name-updated", loadProjectName)
  }, [])

  // Save logs to state & IndexedDB + BACKGROUND sync to cloud
  const saveAndSyncLogs = async (updatedLogs: DailyLog[]) => {
    setLogs(updatedLogs)
    try {
      // 1. Instant Offline Local Save
      await set("daily_logs_data", updatedLogs)

      const nonWorkdaysMap = updatedLogs
        .filter((l) => l.isNonWorkday)
        .reduce((acc, l) => {
          const rawDate = l.date.includes("T") ? l.date.split("T")[0] : l.date
          acc[rawDate] = l.nonWorkdayTitle || "Non-Workday"
          return acc
        }, {} as Record<string, string>)

      await set("non_workdays_map", nonWorkdaysMap)

      // Notify other tabs instantly
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("logs-updated"))
      }

      // 2. BACKGROUND CLOUD PUSH (Removed 'await' so UI never freezes)
      syncManager.pushToCloud("daily_logs_data", updatedLogs).catch(e => console.error("Cloud logs sync failed:", e))
      syncManager.pushToCloud("non_workdays_map", nonWorkdaysMap).catch(e => console.error("Cloud map sync failed:", e))

    } catch (e) {
      console.error("Failed to save logs locally:", e)
    }
  }

  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => b.date.localeCompare(a.date))
  }, [logs])

  // Automatic Weather Fetcher via Open-Meteo API
  const fetchWeatherForDate = async (targetDateStr: string) => {
    setIsFetchingWeather(true)
    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude
          const lon = position.coords.longitude
          await queryWeatherApi(lat, lon, targetDateStr)
        },
        async () => {
          await queryWeatherApi(40.5853, -105.0844, targetDateStr)
        },
        { timeout: 5000 }
      )
    } catch (err) {
      console.error("Weather fetch failed:", err)
      setIsFetchingWeather(false)
    }
  }

  const queryWeatherApi = async (lat: number, lon: number, dateStr: string) => {
    try {
      const isToday = dateStr === getTodayInputDate()
      let apiUrl = ""

      if (isToday) {
        apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit`
      } else {
        apiUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${dateStr}&end_date=${dateStr}&daily=temperature_2m_max,weathercode&temperature_unit=fahrenheit&timezone=auto`
      }

      const res = await fetch(apiUrl)
      const data = await res.json()

      if (isToday && data.current_weather) {
        const temp = Math.round(data.current_weather.temperature)
        const code = data.current_weather.weathercode
        const weatherDesc = getWeatherConditionFromCode(code)
        setLogWeather(`${weatherDesc}, ${temp}°F`)
      } else if (data.daily && data.daily.temperature_2m_max?.[0] !== undefined) {
        const temp = Math.round(data.daily.temperature_2m_max[0])
        const code = data.daily.weathercode?.[0] || 0
        const weatherDesc = getWeatherConditionFromCode(code)
        setLogWeather(`${weatherDesc}, ${temp}°F`)
      }
    } catch (e) {
      console.error("Failed to parse weather API:", e)
    } finally {
      setIsFetchingWeather(false)
    }
  }

  const getWeatherConditionFromCode = (code: number): string => {
    if (code === 0) return "Clear/Sunny"
    if (code <= 3) return "Partly Cloudy"
    if (code <= 48) return "Foggy"
    if (code <= 67) return "Rainy"
    if (code <= 77) return "Snowy"
    if (code <= 82) return "Showers"
    if (code >= 95) return "Thunderstorm"
    return "Overcast"
  }

  // Convert Base64 or Image URL to clean JPG Blob
  const fetchJpgBlob = async (url: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.fillStyle = "#FFFFFF"
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0)
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob)
              else reject(new Error("Canvas conversion failed"))
            },
            "image/jpeg",
            0.92
          )
        }
      }
      img.onerror = (err) => reject(err)
      img.src = url
    })
  }

  // Helper function to capture a log card to a canvas
  const renderLogToCanvas = async (log: DailyLog): Promise<HTMLCanvasElement | null> => {
    setExportLogTarget(log)
    await new Promise((r) => setTimeout(r, 150))
    if (!exportCardRef.current) return null

    return await html2canvas(exportCardRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    })
  }

  // Export Single Log: PDF + JPG Photos in a ZIP
  const handleExportLogAndPhotos = async (log: DailyLog) => {
    setIsExporting(true)
    setExportProgress("Preparing export...")

    try {
      const canvas = await renderLogToCanvas(log)
      if (!canvas) throw new Error("Could not render log canvas")

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p", "mm", "a4")
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
      const pdfBlob = pdf.output("blob")

      const zip = new JSZip()
      const dateFormatted = log.date || "log"
      const safeName = projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()

      zip.file(`${safeName}_Daily_Log_${dateFormatted}.pdf`, pdfBlob)

      if (log.photos && log.photos.length > 0) {
        const photoFolder = zip.folder("photos")
        for (let i = 0; i < log.photos.length; i++) {
          try {
            const jpgBlob = await fetchJpgBlob(log.photos[i])
            photoFolder?.file(`photo_${i + 1}.jpg`, jpgBlob)
          } catch (e) {
            console.error("Failed to package photo:", e)
          }
        }
      }

      const zipContent = await zip.generateAsync({ type: "blob" })
      saveAs(zipContent, `${safeName}_Daily_Log_${dateFormatted}_Export.zip`)
    } catch (err) {
      console.error("Export failed:", err)
    } finally {
      setIsExporting(false)
      setExportLogTarget(null)
      setExportProgress("")
    }
  }

  // Export ALL Logs: Master PDF + individual PDFs + all photos in a ZIP package
  const handleExportAllLogs = async () => {
    if (sortedLogs.length === 0) return

    setIsExporting(true)
    const zip = new JSZip()
    const pdfsFolder = zip.folder("Daily_Logs_PDFs")
    const photosFolder = zip.folder("All_Photos")
    const safeName = projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()

    try {
      const masterPdf = new jsPDF("p", "mm", "a4")
      const pdfWidth = masterPdf.internal.pageSize.getWidth()

      for (let index = 0; index < sortedLogs.length; index++) {
        const log = sortedLogs[index]
        setExportProgress(`Processing log ${index + 1} of ${sortedLogs.length}...`)

        const canvas = await renderLogToCanvas(log)
        if (!canvas) continue

        const imgData = canvas.toDataURL("image/png")
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width

        if (index > 0) masterPdf.addPage()
        masterPdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)

        const singlePdf = new jsPDF("p", "mm", "a4")
        singlePdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
        pdfsFolder?.file(`${safeName}_Daily_Log_${log.date}.pdf`, singlePdf.output("blob"))

        if (log.photos && log.photos.length > 0) {
          for (let pIdx = 0; pIdx < log.photos.length; pIdx++) {
            try {
              const jpgBlob = await fetchJpgBlob(log.photos[pIdx])
              photosFolder?.file(`${log.date}_photo_${pIdx + 1}.jpg`, jpgBlob)
            } catch (e) {
              console.error(`Failed to export photo for ${log.date}:`, e)
            }
          }
        }
      }

      setExportProgress("Finalizing ZIP archive...")
      zip.file(`${safeName}_All_Daily_Logs_Combined.pdf`, masterPdf.output("blob"))

      const todayStr = getTodayInputDate()
      const zipContent = await zip.generateAsync({ type: "blob" })
      saveAs(zipContent, `${safeName}_All_Daily_Logs_Export_${todayStr}.zip`)
    } catch (err) {
      console.error("Export all failed:", err)
    } finally {
      setIsExporting(false)
      setExportLogTarget(null)
      setExportProgress("")
    }
  }

  const handleOpenModal = (logToEdit?: DailyLog) => {
    if (logToEdit) {
      setEditingLog(logToEdit)
      setLogDate(logToEdit.date)
      setLogWeather(logToEdit.weather || "")
      setIsNonWorkday(Boolean(logToEdit.isNonWorkday))
      setNonWorkdayTitle(logToEdit.nonWorkdayTitle || "")
      setLogNotes(logToEdit.notes)
      setLogPhotos(logToEdit.photos)
    } else {
      const defaultDate = getTodayInputDate()
      setEditingLog(null)
      setLogDate(defaultDate)
      setLogWeather("")
      setIsNonWorkday(false)
      setNonWorkdayTitle("")
      setLogNotes("")
      setLogPhotos([])
      fetchWeatherForDate(defaultDate)
    }
    setIsLogDialogOpen(true)
  }

  const handleDateChange = (newDateStr: string) => {
    setLogDate(newDateStr)
    if (newDateStr) {
      fetchWeatherForDate(newDateStr)
    }
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files)

    files.forEach((file) => {
      const reader = new FileReader()
      
      // Auto-compress the image to bypass cloud payload limits
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement("canvas")
          const MAX_WIDTH = 1200
          const MAX_HEIGHT = 1200
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height
              height = MAX_HEIGHT
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext("2d")
          ctx?.drawImage(img, 0, 0, width, height)

          // Compress to 70% quality JPEG format
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7)
          setLogPhotos((prev) => [...prev, compressedBase64])
        }
        
        if (event.target?.result) {
          img.src = event.target.result as string
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemovePhoto = (index: number) => {
    setLogPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSaveLog = async () => {
    if (!logNotes.trim() && !isNonWorkday) return

    let updatedLogs: DailyLog[] = []

    if (editingLog) {
      updatedLogs = logs.map((l) =>
        l.id === editingLog.id
          ? {
              ...l,
              date: logDate,
              weather: logWeather,
              isNonWorkday,
              nonWorkdayTitle: isNonWorkday ? nonWorkdayTitle : "",
              notes: logNotes,
              photos: logPhotos,
            }
          : l
      )
    } else {
      updatedLogs = [
        {
          id: Date.now(),
          date: logDate,
          weather: logWeather,
          isNonWorkday,
          nonWorkdayTitle: isNonWorkday ? nonWorkdayTitle : "",
          notes: logNotes,
          photos: logPhotos,
        },
        ...logs,
      ]
    }

    // Await the local save ONLY. The cloud push happens silently in the background!
    await saveAndSyncLogs(updatedLogs)
    
    // Instantly close the modal
    setIsLogDialogOpen(false)
  }

  const handleDeleteLog = async (id: number) => {
    const updatedLogs = logs.filter((l) => l.id !== id)
    await saveAndSyncLogs(updatedLogs)
  }

  return (
    <main className="p-6 bg-slate-100 min-h-screen space-y-6 flex flex-col text-slate-950">
      
      <div className="bg-slate-900 text-white p-6 md:px-8 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:h-[140px] shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">📷 Daily Logs & Photos</h1>
          </div>
          <p className="text-sm font-medium text-orange-400 mt-1.5 leading-relaxed max-w-2xl">
            Record daily job site progress, weather conditions, notes, and photos.
          </p>
        </div>

        <div className="flex items-center justify-center w-full md:w-auto gap-3 shrink-0">
          {sortedLogs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={isExporting}
              onClick={handleExportAllLogs}
              className="text-white border-slate-700 bg-slate-800/80 hover:bg-slate-700 hover:text-white h-10 text-xs font-semibold px-4 shadow-sm"
            >
              📦 Download All
            </Button>
          )}

          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white h-10 text-xs font-semibold px-4 shadow-sm"
            onClick={() => handleOpenModal()}
          >
            + Add a Log
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border shadow-sm bg-white flex-1">
        
        {isExporting && exportProgress && (
          <div className="bg-indigo-50 border-b border-indigo-200 text-indigo-900 text-xs px-6 py-2.5 flex items-center justify-between animate-pulse">
            <span>⏳ {exportProgress}</span>
            <span className="font-semibold text-[11px] uppercase tracking-wider">Exporting</span>
          </div>
        )}

        <div className="p-6">
          {sortedLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm border-2 border-dashed rounded-lg">
              No daily logs found. Click <strong>"+ Add a Log"</strong> to create your first entry.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {sortedLogs.map((log) => (
                <div
                  key={log.id}
                  className="py-5 first:pt-0 last:pb-0 flex flex-col sm:flex-row gap-4 justify-between items-start"
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-slate-900 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        📅 {formatDisplayDate(log.date)}
                      </span>
                      {log.weather && (
                        <span className="bg-amber-100 text-amber-800 border border-amber-200 text-xs font-medium px-2.5 py-0.5 rounded-full">
                          ☀️ {log.weather}
                        </span>
                      )}
                      {log.isNonWorkday && (
                        <span className="bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                          🚫 Non-Workday {log.nonWorkdayTitle ? `(${log.nonWorkdayTitle})` : ""}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {log.notes}
                    </p>

                    {log.photos.length > 0 && (
                      <div className="flex flex-wrap gap-3 pt-1">
                        {log.photos.map((photoUrl, idx) => (
                          <div
                            key={idx}
                            className="relative group rounded-md overflow-hidden border bg-slate-100 cursor-pointer"
                            onClick={() => setLightboxPhoto(photoUrl)}
                          >
                            <img
                              src={photoUrl}
                              alt={`Attachment ${idx + 1}`}
                              className="h-20 w-24 object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                      disabled={isExporting}
                      onClick={() => handleExportLogAndPhotos(log)}
                    >
                      📦 Download (PDF + JPGs)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      onClick={() => handleOpenModal(log)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-rose-600 hover:bg-rose-50"
                      onClick={() => handleDeleteLog(log.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </Card>

      <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingLog ? "Edit Daily Log" : "Add Daily Log"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="log-date">Date</Label>
                <Input
                  id="log-date"
                  type="date"
                  value={logDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="log-weather">Weather</Label>
                  <button
                    type="button"
                    onClick={() => fetchWeatherForDate(logDate)}
                    disabled={isFetchingWeather}
                    className="text-[11px] text-indigo-600 hover:underline disabled:opacity-50"
                  >
                    {isFetchingWeather ? "Fetching..." : "🔄 Auto-Fetch"}
                  </button>
                </div>
                <Input
                  id="log-weather"
                  placeholder="e.g. Sunny, 85°F"
                  value={logWeather}
                  onChange={(e) => setLogWeather(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-md border border-slate-200 space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="non-workday"
                  checked={isNonWorkday}
                  onChange={(e) => setIsNonWorkday(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="non-workday" className="text-sm font-medium text-slate-800 cursor-pointer select-none">
                  Mark as Non-Workday
                </label>
              </div>

              {isNonWorkday && (
                <div className="grid gap-1.5 pt-1">
                  <Label htmlFor="non-workday-title" className="text-xs text-slate-600 font-semibold">
                    Non-Workday Title / Reason
                  </Label>
                  <Input
                    id="non-workday-title"
                    placeholder="e.g. Rainout, Thanksgiving, Equipment Failure"
                    value={nonWorkdayTitle}
                    onChange={(e) => setNonWorkdayTitle(e.target.value)}
                    className="bg-white text-sm"
                  />
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="log-notes">Log Summary & Notes</Label>
              <textarea
                id="log-notes"
                rows={4}
                placeholder="Describe work completed, site conditions, delays, or issues..."
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                className="w-full p-2.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid gap-2">
              <Label>Attach Photos</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="cursor-pointer"
              />

              {logPhotos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 p-2 bg-slate-50 border rounded-lg">
                  {logPhotos.map((p, index) => (
                    <div key={index} className="relative group h-16 w-16 rounded border overflow-hidden">
                      <img
                        src={p}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] hover:bg-rose-600"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsLogDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSaveLog}>
              {editingLog ? "Update Log" : "Save Log"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="absolute top-[-9999px] left-[-9999px]">
        {exportLogTarget && (
          <div
            ref={exportCardRef}
            className="w-[500px] bg-white p-6 border rounded-xl shadow-lg space-y-4 text-slate-900"
          >
            <div className="border-b pb-3">
              <h2 className="text-lg font-bold">Daily Log Entry</h2>
              <p className="text-xs text-slate-500">{projectName} - Site Documentation</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-2.5 rounded-md border text-xs">
                <span className="text-slate-500 block font-medium">Date</span>
                <span className="font-semibold">{formatDisplayDate(exportLogTarget.date)}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-md border text-xs">
                <span className="text-slate-500 block font-medium">Weather</span>
                <span className="font-semibold">{exportLogTarget.weather || "N/A"}</span>
              </div>
            </div>

            {exportLogTarget.isNonWorkday && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-md text-xs text-rose-800">
                <span className="font-bold">🚫 Non-Workday: </span>
                {exportLogTarget.nonWorkdayTitle || "No reason specified"}
              </div>
            )}

            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Log Summary & Notes</span>
              <div className="p-3 bg-slate-50 border rounded-md text-xs whitespace-pre-wrap leading-relaxed">
                {exportLogTarget.notes || "No notes entered."}
              </div>
            </div>

            {exportLogTarget.photos.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">
                  Attached Photos ({exportLogTarget.photos.length})
                </span>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {exportLogTarget.photos.map((p, idx) => (
                    <div key={idx} className="h-24 rounded border overflow-hidden bg-slate-100">
                      <img src={p} alt="Attachment" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={Boolean(lightboxPhoto)} onOpenChange={() => setLightboxPhoto(null)}>
        <DialogContent className="max-w-[90vw] md:max-w-5xl h-[85vh] p-2 bg-black/95 border-slate-800 flex flex-col items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center p-2">
            {lightboxPhoto && (
              <img
                src={lightboxPhoto}
                alt="Enlarged attachment"
                className="max-h-full max-w-full object-contain rounded-sm"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="w-full text-center py-6 text-xs text-slate-500 border-t border-slate-200 mt-8">
        CleanBuild v1.08
      </div>
      
    </main>
  )
}