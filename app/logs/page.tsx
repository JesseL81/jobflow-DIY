"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { get, set } from "idb-keyval"
import { syncManager } from "@/lib/syncManager"
import html2canvas from "html2canvas-pro"
import jsPDF from "jspdf"
import JSZip from "jszip"
import { saveAs } from "file-saver"

interface VisionBoardItem {
  id: number
  date: string 
  category: string
  notes: string
  url?: string
  photos: string[]
}

const DEFAULT_CATEGORIES = [
  "All Categories",
  "Inspiration & Ideas",
  "Materials & Finishes",
  "Trim",
  "Paint",
  "Lighting",
  "Hardware & Fixtures"
]

const INITIAL_BOARD: VisionBoardItem[] = [
  {
    id: 1,
    date: "2026-08-28",
    category: "Inspiration & Ideas",
    notes: "👋 Welcome to the Vision Board! Click '+ Add Photos / Idea' to upload your own.",
    url: "https://diy.cleanbuild.us",
    photos: ["https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?w=800&auto=format&fit=crop&q=80"],
  }
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

export default function VisionBoardPage() {
  const [isMounted, setIsMounted] = useState(false)
  
  const [boardItems, setBoardItems] = useState<VisionBoardItem[]>([])
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [selectedCategory, setSelectedCategory] = useState<string>("All Categories")
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingItem, setEditingItem] = useState<VisionBoardItem | null>(null)

  const [itemDate, setItemDate] = useState("")
  const [itemCategory, setItemCategory] = useState("Inspiration & Ideas")
  const [itemNotes, setItemNotes] = useState("")
  const [itemUrl, setItemUrl] = useState("")
  const [itemPhotos, setItemPhotos] = useState<string[]>([])

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)
  
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState("")
  const exportCardRef = useRef<HTMLDivElement>(null)
  const [exportTarget, setExportTarget] = useState<VisionBoardItem | null>(null)

  useEffect(() => {
    setIsMounted(true)

    async function loadData() {
      try {
        // 1. Instant Offline Load (Now accepts empty arrays)
        const savedData = await get<VisionBoardItem[]>("jobflow_vision_board") 
        if (savedData) {
          const sanitizedData = savedData.map(item => ({
            ...item, photos: Array.isArray(item?.photos) ? item.photos : []
          }))
          setBoardItems(sanitizedData)
        } else {
          setBoardItems(INITIAL_BOARD)
        }

        const savedCategories = await get<string[]>("jobflow_vision_board_categories")
        if (savedCategories) {
          setCategories(savedCategories)
        } else {
          setCategories(DEFAULT_CATEGORIES)
        }

        // 2. Silent Cloud Pull
        const cloudData = await syncManager.pullFromCloud("jobflow_vision_board")
        if (cloudData) setBoardItems(cloudData)

        const cloudCategories = await syncManager.pullFromCloud("jobflow_vision_board_categories")
        if (cloudCategories) setCategories(cloudCategories)

      } catch (e) {
        console.error("Error loading Vision Board:", e)
        setBoardItems(INITIAL_BOARD)
        setCategories(DEFAULT_CATEGORIES)
      }
    }
    loadData()
  }, [])

  const saveAndSync = async (updatedItems: VisionBoardItem[]) => {
    setBoardItems(updatedItems || [])
    try {
      await set("jobflow_vision_board", updatedItems || [])
      await syncManager.pushToCloud("jobflow_vision_board", updatedItems || [])
    } catch (e) {
      console.error("Failed to sync Vision Board:", e)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    const trimmed = newCategoryName.trim()
    
    if ((categories || []).includes(trimmed)) {
      setNewCategoryName("")
      setIsAddingCategory(false)
      return
    }

    const updatedCategories = [...(categories || []), trimmed]
    setCategories(updatedCategories)
    
    try {
      await set("jobflow_vision_board_categories", updatedCategories)
      await syncManager.pushToCloud("jobflow_vision_board_categories", updatedCategories)
    } catch (e) {
      console.error("Failed to save categories:", e)
    }

    setNewCategoryName("")
    setIsAddingCategory(false)
    setSelectedCategory(trimmed) 
  }

  const sortedItems = useMemo(() => {
    return [...(boardItems || [])].sort((a, b) => (b?.date || "").localeCompare(a?.date || ""))
  }, [boardItems])

  const filteredItems = useMemo(() => {
    return (sortedItems || []).filter(item => {
      if (selectedCategory === "All Categories") return true
      return (item?.category || "Inspiration & Ideas") === selectedCategory
    })
  }, [sortedItems, selectedCategory])

  const filteredPhotos = useMemo(() => {
    return (filteredItems || []).flatMap((item) => {
      if (Array.isArray(item?.photos)) return item.photos;
      return [];
    });
  }, [filteredItems])

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

  const renderItemToCanvas = async (item: VisionBoardItem): Promise<HTMLCanvasElement | null> => {
    setExportTarget(item)
    await new Promise((r) => setTimeout(r, 150))
    if (!exportCardRef.current) return null

    return await html2canvas(exportCardRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    })
  }

  const handleExportItemAndPhotos = async (item: VisionBoardItem) => {
    setIsExporting(true)
    setExportProgress("Preparing export...")

    try {
      const canvas = await renderItemToCanvas(item)
      if (!canvas) throw new Error("Could not render canvas")

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p", "mm", "a4")
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
      const pdfBlob = pdf.output("blob")

      const zip = new JSZip()
      const dateFormatted = item?.date || "vision_board"
      zip.file(`Vision_Board_${dateFormatted}.pdf`, pdfBlob)

      const safePhotos = item?.photos || []
      if (Array.isArray(safePhotos) && safePhotos.length > 0) {
        const photoFolder = zip.folder("photos")
        for (let i = 0; i < safePhotos.length; i++) {
          try {
            const jpgBlob = await fetchJpgBlob(safePhotos[i])
            photoFolder?.file(`photo_${i + 1}.jpg`, jpgBlob)
          } catch (e) {
            console.error("Failed to package photo:", e)
          }
        }
      }

      const zipContent = await zip.generateAsync({ type: "blob" })
      saveAs(zipContent, `Vision_Board_${dateFormatted}_Export.zip`)
    } catch (err) {
      console.error("Export failed:", err)
    } finally {
      setIsExporting(false)
      setExportTarget(null)
      setExportProgress("")
    }
  }

  const handleExportAll = async () => {
    const safeItems = filteredItems || []
    if (safeItems.length === 0) return

    setIsExporting(true)
    const zip = new JSZip()
    const pdfsFolder = zip.folder("Vision_Board_PDFs")
    const photosFolder = zip.folder("All_Photos")

    try {
      const masterPdf = new jsPDF("p", "mm", "a4")
      const pdfWidth = masterPdf.internal.pageSize.getWidth()

      for (let index = 0; index < safeItems.length; index++) {
        const item = safeItems[index]
        setExportProgress(`Processing item ${index + 1} of ${safeItems.length}...`)

        const canvas = await renderItemToCanvas(item)
        if (!canvas) continue

        const imgData = canvas.toDataURL("image/png")
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width

        if (index > 0) masterPdf.addPage()
        masterPdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)

        const singlePdf = new jsPDF("p", "mm", "a4")
        singlePdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
        pdfsFolder?.file(`Vision_${item.date}.pdf`, singlePdf.output("blob"))

        const safePhotos = item?.photos || []
        if (Array.isArray(safePhotos) && safePhotos.length > 0) {
          for (let pIdx = 0; pIdx < safePhotos.length; pIdx++) {
            try {
              const jpgBlob = await fetchJpgBlob(safePhotos[pIdx])
              photosFolder?.file(`${item.date}_photo_${pIdx + 1}.jpg`, jpgBlob)
            } catch (e) {
              console.error(`Failed to export photo for ${item.date}:`, e)
            }
          }
        }
      }

      setExportProgress("Finalizing ZIP archive...")
      zip.file(`Vision_Board_Combined.pdf`, masterPdf.output("blob"))

      const todayStr = getTodayInputDate()
      const zipContent = await zip.generateAsync({ type: "blob" })
      saveAs(zipContent, `Vision_Board_Export_${todayStr}.zip`)
    } catch (err) {
      console.error("Export all failed:", err)
    } finally {
      setIsExporting(false)
      setExportTarget(null)
      setExportProgress("")
    }
  }

  const handleNextPhoto = () => {
    const safePhotos = filteredPhotos || []
    if (selectedPhotoIndex === null || safePhotos.length === 0) return
    setSelectedPhotoIndex((prev) => (prev !== null && prev < safePhotos.length - 1 ? prev + 1 : 0))
  }

  const handlePrevPhoto = () => {
    const safePhotos = filteredPhotos || []
    if (selectedPhotoIndex === null || safePhotos.length === 0) return
    setSelectedPhotoIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : safePhotos.length - 1))
  }

  const handleOpenModal = (itemToEdit?: VisionBoardItem) => {
    setIsSubmitting(false)
    if (itemToEdit) {
      setEditingItem(itemToEdit)
      setItemDate(itemToEdit.date || getTodayInputDate())
      setItemCategory(itemToEdit.category || "Inspiration & Ideas")
      setItemNotes(itemToEdit.notes || "")
      setItemUrl(itemToEdit.url || "")
      setItemPhotos(Array.isArray(itemToEdit.photos) ? itemToEdit.photos : [])
    } else {
      const defaultDate = getTodayInputDate()
      setEditingItem(null)
      setItemDate(defaultDate)
      setItemCategory(selectedCategory !== "All Categories" ? selectedCategory : "Inspiration & Ideas")
      setItemNotes("")
      setItemUrl("")
      setItemPhotos([])
    }
    setIsModalOpen(true)
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files)

    files.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (reader.result) {
          setItemPhotos((prev) => [...(prev || []), reader.result as string])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemovePhoto = (index: number) => {
    setItemPhotos((prev) => (prev || []).filter((_, i) => i !== index))
  }

  const handleSaveItem = async () => {
    if (!itemNotes.trim() && (itemPhotos || []).length === 0 && !itemUrl.trim()) return
    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      let updatedItems: VisionBoardItem[] = []

      if (editingItem) {
        updatedItems = (boardItems || []).map((l) =>
          l.id === editingItem.id
            ? {
                ...l,
                date: itemDate,
                category: itemCategory,
                notes: itemNotes,
                url: itemUrl.trim(),
                photos: itemPhotos || [],
              }
            : l
        )
      } else {
        updatedItems = [
          {
            id: Date.now(),
            date: itemDate,
            category: itemCategory,
            notes: itemNotes,
            url: itemUrl.trim(),
            photos: itemPhotos || [],
          },
          ...(boardItems || []),
        ]
      }

      await saveAndSync(updatedItems)
      setIsModalOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteItem = async (id: number) => {
    const updatedItems = (boardItems || []).filter((l) => l.id !== id)
    await saveAndSync(updatedItems)
  }

  if (!isMounted) return null;

  return (
    <main className="p-6 bg-slate-100 min-h-screen space-y-6 flex flex-col text-slate-950">
      <div className="bg-slate-900 text-white p-6 md:px-8 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:h-[140px]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">📷 Vision Board</h1>
          </div>
          <p className="text-sm font-medium text-orange-400 mt-1.5 leading-relaxed max-w-2xl">
            Organize inspiration, materials, paint colors, and design ideas into visual categories.
          </p>
        </div>

        <div className="flex items-center justify-center w-full md:w-auto gap-3 shrink-0">
          {(filteredItems || []).length > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={isExporting}
              onClick={handleExportAll}
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
            + Add Photos / Idea
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
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-3 space-y-2">
              <div className="bg-white p-3 rounded-xl border shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-2">
                  Vision Board Folders
                </span>
                
                {(categories || []).map((cat) => {
                  const catCount = cat === "All Categories" 
                    ? (boardItems || []).length 
                    : (boardItems || []).filter((l) => (l?.category || "Inspiration & Ideas") === cat).length
                  
                  const isActive = selectedCategory === cat

                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isActive ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span className="truncate">{cat}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-500"}`}>
                        {catCount}
                      </span>
                    </button>
                  )
                })}

                {isAddingCategory ? (
                  <div className="flex flex-col gap-2 mt-2 px-1 py-1">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="New category name..."
                      className="h-8 text-xs bg-slate-50 border-slate-300"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddCategory()
                        if (e.key === "Escape") {
                          setIsAddingCategory(false)
                          setNewCategoryName("")
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={handleAddCategory} className="flex-1 h-7 text-[10px] bg-blue-600 hover:bg-blue-700 text-white">
                        Save
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => {
                        setIsAddingCategory(false)
                        setNewCategoryName("")
                      }} className="h-7 px-3 text-[10px] text-slate-500 hover:bg-slate-100">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 px-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingCategory(true)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-dashed border-slate-300"
                    >
                      + Add Custom Category
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-9">
              {(filteredItems || []).length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl text-slate-400 text-sm border-2 border-dashed border-slate-200 shadow-sm">
                  No images or ideas found in this category.<br />
                  Click <strong>"+ Add Photos / Idea"</strong> to start building your vision board.
                </div>
              ) : (
                <div className="space-y-6">
                  {(filteredItems || []).map((item) => (
                    <Card key={item.id} className="p-5 border border-slate-200 shadow-sm bg-white overflow-hidden">
                      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
                        <div className="space-y-3 flex-1 w-full">
                          
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="bg-slate-900 text-white hover:bg-slate-800 text-[10px]">
                              📅 Added: {formatDisplayDate(item.date)}
                            </Badge>
                            
                            <Badge variant="outline" className="text-indigo-700 border-indigo-200 bg-indigo-50 text-[10px]">
                              📁 {item.category || "Inspiration & Ideas"}
                            </Badge>
                          </div>

                          {item.notes && (
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                              {item.notes}
                            </p>
                          )}

                          {item.url && (
                            <div className="pt-1">
                              <a
                                href={item.url.startsWith("http") ? item.url : `https://${item.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex text-indigo-600 hover:text-indigo-800 font-bold items-center gap-1.5 text-xs bg-indigo-50/50 py-1.5 px-3 rounded-md border border-indigo-100 transition-colors"
                              >
                                🔗 Open Reference Link ↗
                              </a>
                            </div>
                          )}

                          {item.photos && Array.isArray(item.photos) && item.photos.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                              {(item.photos || []).map((photoUrl, idx) => {
                                const globalIndex = (filteredPhotos || []).indexOf(photoUrl)
                                return (
                                  <div
                                    key={idx}
                                    className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer aspect-square shadow-sm"
                                    onClick={() => setSelectedPhotoIndex(globalIndex)}
                                  >
                                    <img
                                      src={photoUrl}
                                      alt={`Attachment ${idx + 1}`}
                                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 shadow-xs"
                            disabled={isExporting}
                            onClick={() => handleExportItemAndPhotos(item)}
                            title="Export PDF & Photos"
                          >
                            📥 Export
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs text-slate-700 shadow-xs"
                            onClick={() => handleOpenModal(item)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-rose-600 hover:bg-rose-50"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[550px] bg-white text-slate-900 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingItem ? "Edit Board Entry" : "Add Photos / Idea"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Upload photos to your vision board, tag the category, and add any design notes.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="item-date" className="font-semibold text-slate-700 text-xs">Date Added</Label>
                <Input
                  id="item-date"
                  type="date"
                  value={itemDate}
                  onChange={(e) => setItemDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="item-category" className="font-semibold text-slate-700 text-xs">Folder / Category</Label>
                <select
                  id="item-category"
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                >
                  {(categories || []).filter(c => c !== "All Categories").map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="item-notes" className="font-semibold text-slate-700 text-xs">Idea Summary & Notes</Label>
              <textarea
                id="item-notes"
                rows={3}
                placeholder="Describe this idea, color code, or inspiration..."
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              />
            </div>
            
            <div className="grid gap-1.5">
              <Label htmlFor="item-url" className="font-semibold text-slate-700 text-xs">Reference Link / URL (Optional)</Label>
              <Input
                id="item-url"
                placeholder="e.g. https://pinterest.com/... or Home Depot link"
                value={itemUrl}
                onChange={(e) => setItemUrl(e.target.value)}
                className="h-9 text-xs bg-white border-slate-200"
              />
            </div>

            <div className="grid gap-1.5 border-t pt-3">
              <Label className="font-semibold text-slate-700 text-xs">Attach Board Photos</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="cursor-pointer text-xs h-9"
              />

              {(itemPhotos || []).length > 0 && (
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 mt-2">
                  {(itemPhotos || []).map((p, index) => (
                    <div key={index} className="relative group aspect-square rounded border border-slate-200 overflow-hidden shadow-sm">
                      <img
                        src={p}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 hover:bg-rose-600 transition-all"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm disabled:opacity-50" 
              onClick={handleSaveItem}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : editingItem ? "Update Entry" : "Save to Board"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="absolute top-[-9999px] left-[-9999px]">
        {exportTarget && (
          <div
            ref={exportCardRef}
            className="w-[500px] bg-white p-6 border rounded-xl shadow-lg space-y-4 text-slate-900"
          >
            <div className="border-b pb-3">
              <h2 className="text-lg font-bold">Vision Board Idea</h2>
              <p className="text-xs text-slate-500">Project Inspiration</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-2.5 rounded-md border text-xs">
                <span className="text-slate-500 block font-medium">Date Added</span>
                <span className="font-semibold">{formatDisplayDate(exportTarget.date)}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-md border text-xs">
                <span className="text-slate-500 block font-medium">Category</span>
                <span className="font-semibold">{exportTarget.category || "Inspiration & Ideas"}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Summary & Notes</span>
              <div className="p-3 bg-slate-50 border rounded-md text-xs whitespace-pre-wrap leading-relaxed min-h-[60px]">
                {exportTarget.notes || "No notes entered."}
              </div>
            </div>

            {exportTarget.url && (
              <div className="bg-slate-50 p-2.5 rounded-md border text-xs mt-3">
                <span className="text-slate-500 block font-medium">Reference Link</span>
                <span className="font-semibold text-indigo-600">{exportTarget.url}</span>
              </div>
            )}

            {exportTarget.photos && Array.isArray(exportTarget.photos) && exportTarget.photos.length > 0 && (
              <div className="space-y-1 mt-4">
                <span className="text-xs font-semibold text-slate-600">
                  Attached Photos ({exportTarget.photos.length})
                </span>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {(exportTarget.photos || []).map((p, idx) => (
                    <div key={idx} className="aspect-square rounded border overflow-hidden bg-slate-100">
                      <img src={p} alt="Attachment" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={selectedPhotoIndex !== null} onOpenChange={() => setSelectedPhotoIndex(null)}>
        <DialogContent 
          className="max-w-[95vw] md:max-w-5xl h-[85vh] p-4 bg-slate-950 text-white border-slate-800 flex flex-col justify-between outline-none"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") handleNextPhoto()
            if (e.key === "ArrowLeft") handlePrevPhoto()
          }}
        >
          <DialogTitle className="sr-only">Photo Viewer</DialogTitle>
          <DialogDescription className="sr-only">View full resolution project photos.</DialogDescription>

          {selectedPhotoIndex !== null && filteredPhotos && filteredPhotos[selectedPhotoIndex] && (
            <>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-xs font-semibold text-slate-300">
                  🖼️ Photo {selectedPhotoIndex + 1} of {(filteredPhotos || []).length}
                </span>
                <span className="text-[11px] text-slate-400">
                  Use ← / → keys or side arrows to cycle photos
                </span>
              </div>

              <div className="relative flex-1 flex items-center justify-center my-2 bg-black rounded-lg overflow-hidden">
                <img
                  src={filteredPhotos[selectedPhotoIndex]}
                  alt={`Enlarged site photo ${selectedPhotoIndex + 1}`}
                  className="max-h-[68vh] max-w-full object-contain"
                />

                {(filteredPhotos || []).length > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevPhoto}
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white font-bold text-2xl flex items-center justify-center border border-slate-700 shadow-xl transition-transform hover:scale-110 active:scale-95"
                    title="Previous Photo (Left Arrow)"
                  >
                    ‹
                  </button>
                )}

                {(filteredPhotos || []).length > 1 && (
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
    </main>
  )
}