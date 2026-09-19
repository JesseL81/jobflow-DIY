"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { get, set } from "idb-keyval"
import { syncManager } from "@/lib/syncManager"
import { useOfflineSync } from "@/hooks/useOfflineSync"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { PaywallOverlay } from "@/components/paywall-overlay"
import { PageTour } from "@/components/page-tour"

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
  linkTitle?: string
  linkDescription?: string
  linkDomain?: string
  linkImage?: string
  isPromoted?: boolean
  materialCategory?: string
  estimatedPrice?: string
  syncToExpenses?: boolean
}

interface SelectionItem {
  id: string
  title: string
  category: string
  room: string
  vendorUrl: string
  price: string
  modelNumber: string
  notes: string
  status: "Idea / Saved" | "Selected" | "Under Review" | "Ordered" | "Delivered"
  checked: boolean
  syncToExpenses?: boolean
  photoUrl?: string
}

interface ExpenseItem {
  id: number
  date: string
  description: string
  materials: number
  labor: number
}

const DEFAULT_ROOMS = [
  "All Rooms",
  "Kitchen",
  "Master Bathroom",
  "Guest Bathroom",
  "Powder Room",
  "Living & Dining",
  "Bedrooms",
  "Laundry / Mudroom",
  "Exterior",
  "Other",
]

const MATERIAL_CATEGORIES = [
  "Plumbing Fixtures",
  "Tile & Flooring",
  "Lighting & Electrical",
  "Appliances",
  "Paint & Finishes",
  "Cabinetry & Hardware",
  "Doors & Trim",
  "Other"
]

const INITIAL_BOARD: VisionBoardItem[] = [
  {
    id: 1,
    date: "2026-08-28",
    category: "Master Bathroom",
    notes: "👋 Welcome to the Vision Board! Paste a link to a product below, and we will automatically unfurl it into a rich image card just like an iMessage.",
    url: "https://diy.cleanbuild.us",
    photos: ["/Gemini_bathroom.jpeg"],
  }
]

const VISION_BOARD_TOUR_STEPS = [
  {
    target: ".tour-vision-header",
    content: "Welcome to the Vision Board! This is where you collect inspiration, material choices, and design ideas.",
  },
  {
    target: ".tour-vision-folders",
    content: "Organize your ideas into specific rooms. These rooms automatically sync with your Selections tab!",
  },
  {
    target: ".tour-vision-add",
    content: "Click here to add an idea. You can now instantly 'Promote' an idea to a Selection and sync its cost to your expenses!",
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

export default function VisionBoardPage() {
  const [isMounted, setIsMounted] = useState(false)
  
  const [boardItems, setBoardItems] = useOfflineSync<VisionBoardItem[]>("cleanbuild_vision_board", INITIAL_BOARD)
  const [rooms, setRooms] = useOfflineSync<string[]>("cleanbuild_shared_rooms", DEFAULT_ROOMS)
  const [selections, setSelections] = useOfflineSync<SelectionItem[]>("cleanbuild_selections_items", [])
  const [expenses, setExpenses] = useOfflineSync<ExpenseItem[]>("cleanbuild_expenses", [])

  const [currentUserEmail, setCurrentUserEmail] = useState<string>("")
  const [isGuest, setIsGuest] = useState(false)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [accountTier, setAccountTier] = useState<string>("free")
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  
  const [selectedRoom, setSelectedRoom] = useState<string>("All Rooms")
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingItem, setEditingItem] = useState<VisionBoardItem | null>(null)

  const [isOptionsOpen, setIsOptionsOpen] = useState(false)

  const [itemDate, setItemDate] = useState("")
  const [itemCategory, setItemCategory] = useState("Kitchen")
  const [itemNotes, setItemNotes] = useState("")
  const [itemUrl, setItemUrl] = useState("")
  const [itemPhotos, setItemPhotos] = useState<string[]>([])

  const [linkTitle, setLinkTitle] = useState("")
  const [linkDescription, setLinkDescription] = useState("")
  const [linkDomain, setLinkDomain] = useState("")
  const [linkImage, setLinkImage] = useState("")
  const [isFetchingPreview, setIsFetchingPreview] = useState(false)
  const [fetchError, setFetchError] = useState(false) 

  const [isPromoted, setIsPromoted] = useState(false)
  const [materialCategory, setMaterialCategory] = useState("Plumbing Fixtures")
  const [estimatedPrice, setEstimatedPrice] = useState("")
  const [syncToExpenses, setSyncToExpenses] = useState(false)

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)
  
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState("")

  const exportCardRef = useRef<HTMLDivElement>(null)
  const [exportTarget, setExportTarget] = useState<VisionBoardItem | null>(null)

  const [isCategoryDeleteModalOpen, setIsCategoryDeleteModalOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)
  const [categoryDeleteMode, setCategoryDeleteMode] = useState<"move" | "delete">("move")
  const [categoryMoveTarget, setCategoryMoveTarget] = useState<string>("Kitchen")

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMounted && rooms) {
      let needsUpdate = false
      let newRooms = [...rooms]

      const oldIndex = newRooms.indexOf("All Categories")
      if (oldIndex !== -1) {
        newRooms[oldIndex] = "All Rooms"
        needsUpdate = true
      }

      if (!newRooms.includes("All Rooms")) {
        newRooms.unshift("All Rooms")
        needsUpdate = true
      }

      if (newRooms.indexOf("All Rooms") !== 0) {
        newRooms = newRooms.filter(c => c !== "All Rooms")
        newRooms.unshift("All Rooms")
        needsUpdate = true
      }

      if (needsUpdate) {
        setRooms(newRooms)
        if (selectedRoom === "All Categories") {
          setSelectedRoom("All Rooms")
        }
      }
    }
  }, [isMounted, rooms, selectedRoom, setRooms])

  useEffect(() => {
    const fetchUserAndPermissions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.email) return

        setCurrentUserEmail(user.email)

        const { data: profile } = await supabase.from("profiles").select("tier").eq("id", user.id).maybeSingle()
        if (profile) setAccountTier(profile.tier)

        const activeWorkspaceId = localStorage.getItem("cleanbuild_active_workspace") || user.id

        if (activeWorkspaceId === user.id) {
          setIsGuest(false)
          setIsReadOnly(false)
        } else {
          setIsGuest(true)
          const { data: guestInvite } = await supabase
            .from("project_members")
            .select("permissions")
            .eq("invite_email", user.email)
            .ilike("status", "active")
            .maybeSingle()

          if (guestInvite?.permissions?.vision_board === "read-only") {
            setIsReadOnly(true)
          } else {
            setIsReadOnly(false)
          }
        }
      } catch (error) {
        console.error("Failed to load vision board permissions:", error)
      } finally {
        setIsCheckingAuth(false)
      }
    }
    fetchUserAndPermissions()
  }, [])

  useEffect(() => {
    if (!itemUrl.trim()) {
      setLinkTitle("")
      setLinkDescription("")
      setLinkDomain("")
      setLinkImage("")
      setFetchError(false)
      return
    }

    const delayDebounceFn = setTimeout(() => {
      if (itemUrl.startsWith("http") && !linkTitle && !isFetchingPreview && !fetchError) {
        fetchLinkPreview(itemUrl)
      }
    }, 800)

    return () => clearTimeout(delayDebounceFn)
  }, [itemUrl])

  const fetchLinkPreview = async (urlToFetch: string) => {
    setIsFetchingPreview(true)
    setFetchError(false)
    try {
      const res = await fetch(`/api/unfurl?url=${encodeURIComponent(urlToFetch.trim())}`)
      const json = await res.json()
      
      let fallbackDomain = ""
      try { fallbackDomain = new URL(urlToFetch).hostname.replace('www.', '') } catch(e) {}

      if (res.ok && !json.error) {
        setLinkTitle(json.title || "")
        setLinkDescription(json.description || "")
        setLinkDomain(json.domain || fallbackDomain)
        setLinkImage(json.image || "")
      } else {
        setFetchError(true)
        setLinkDomain(fallbackDomain)
      }
    } catch (e) {
      console.error("Failed to fetch link preview:", e)
      setFetchError(true)
      try { setLinkDomain(new URL(urlToFetch).hostname.replace('www.', '')) } catch(err) {}
    } finally {
      setIsFetchingPreview(false)
    }
  }

  const showPaywall = !isCheckingAuth && !isGuest && accountTier === "free"

  const handleAddCategory = async () => {
    if (isReadOnly || !newCategoryName.trim()) return
    const trimmed = newCategoryName.trim()
    
    if ((rooms || []).includes(trimmed)) {
      setNewCategoryName("")
      setIsAddingCategory(false)
      return
    }

    const updatedCategories = [...(rooms || []), trimmed]
    setRooms(updatedCategories)

    setNewCategoryName("")
    setIsAddingCategory(false)
    setSelectedRoom(trimmed) 
  }

  const handleOpenDeleteCategory = (cat: string) => {
    setCategoryToDelete(cat)
    
    const availableFallbacks = (rooms || []).filter(c => c !== "All Rooms" && c !== cat)
    setCategoryMoveTarget(availableFallbacks.includes("Kitchen") ? "Kitchen" : availableFallbacks[0] || "")
    
    setCategoryDeleteMode("move")
    setIsCategoryDeleteModalOpen(true)
  }

  const handleConfirmCategoryDelete = () => {
    if (isReadOnly || !categoryToDelete) return

    let updatedItems = [...(boardItems || [])]
    const itemsInCat = updatedItems.filter(item => item.category === categoryToDelete)

    if (itemsInCat.length > 0) {
      if (categoryDeleteMode === "delete") {
        updatedItems = updatedItems.filter(item => item.category !== categoryToDelete)
      } else if (categoryDeleteMode === "move" && categoryMoveTarget) {
        updatedItems = updatedItems.map(item => 
          item.category === categoryToDelete 
            ? { ...item, category: categoryMoveTarget } 
            : item
        )
      }
    }

    setBoardItems(updatedItems)
    setRooms((rooms || []).filter(c => c !== categoryToDelete))

    if (selectedRoom === categoryToDelete) {
      setSelectedRoom("All Rooms")
    }

    setIsCategoryDeleteModalOpen(false)
    setCategoryToDelete(null)
  }

  // 🔥 Dynamically merge Selections into the Vision Board List
  const combinedItems = useMemo(() => {
    const boardItemIds = new Set((boardItems || []).map(b => b.id.toString()))
    const standaloneSelections = (selections || []).filter(s => !boardItemIds.has(s.id))

    const mappedSelections: VisionBoardItem[] = standaloneSelections.map(s => ({
      id: parseInt(s.id) || Date.now(),
      date: new Date().toISOString().split("T")[0],
      category: s.room || "All Rooms",
      notes: s.notes || "",
      url: s.vendorUrl,
      photos: s.photoUrl ? [s.photoUrl] : [],
      linkTitle: s.title,
      materialCategory: s.category,
      estimatedPrice: s.price,
      isPromoted: true,
      syncToExpenses: s.syncToExpenses,
    }))

    const merged = [...(boardItems || []), ...mappedSelections]
    return merged.sort((a, b) => (b.date || "").localeCompare(a.date || ""))
  }, [boardItems, selections])

  const filteredItems = useMemo(() => {
    return (combinedItems || []).filter(item => {
      if (selectedRoom === "All Rooms") return true
      return (item?.category || "Kitchen") === selectedRoom
    })
  }, [combinedItems, selectedRoom])

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

    try {
      const masterPdf = new jsPDF("p", "mm", "a4")
      const pdfWidth = masterPdf.internal.pageSize.getWidth()

      for (let index = 0; index < safeItems.length; index++) {
        const item = safeItems[index]
        setExportProgress(`Processing item ${index + 1} of ${safeItems.length}...`)

        const roomName = item.category || "Uncategorized"
        const roomFolder = zip.folder(roomName)

        const canvas = await renderItemToCanvas(item)
        if (!canvas) continue

        const imgData = canvas.toDataURL("image/png")
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width

        if (index > 0) masterPdf.addPage()
        masterPdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)

        const singlePdf = new jsPDF("p", "mm", "a4")
        singlePdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
        
        roomFolder?.file(`Vision_${item.date}_${item.id}.pdf`, singlePdf.output("blob"))

        const safePhotos = item?.photos || []
        if (Array.isArray(safePhotos) && safePhotos.length > 0) {
          for (let pIdx = 0; pIdx < safePhotos.length; pIdx++) {
            try {
              const jpgBlob = await fetchJpgBlob(safePhotos[pIdx])
              roomFolder?.file(`${item.date}_${item.id}_photo_${pIdx + 1}.jpg`, jpgBlob)
            } catch (e) {
              console.error(`Failed to export photo for ${item.date}:`, e)
            }
          }
        }
      }

      setExportProgress("Finalizing ZIP archive...")
      zip.file(`Vision_Board_Combined_Master.pdf`, masterPdf.output("blob"))

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

  const handleOpenModal = (itemToEdit?: VisionBoardItem | null, prefillCategory?: string) => {
    setIsSubmitting(false)
    setFetchError(false) 
    
    if (itemToEdit) {
      setEditingItem(itemToEdit)
      setItemDate(itemToEdit.date || getTodayInputDate())
      setItemCategory(itemToEdit.category || "Kitchen")
      setItemNotes(itemToEdit.notes || "")
      setItemUrl(itemToEdit.url || "")
      setItemPhotos(Array.isArray(itemToEdit.photos) ? itemToEdit.photos : [])
      
      setLinkTitle(itemToEdit.linkTitle || "")
      setLinkDescription(itemToEdit.linkDescription || "")
      setLinkDomain(itemToEdit.linkDomain || "")
      setLinkImage(itemToEdit.linkImage || "")
      
      setIsPromoted(itemToEdit.isPromoted || false)
      setMaterialCategory(itemToEdit.materialCategory || "Plumbing Fixtures")
      setEstimatedPrice(itemToEdit.estimatedPrice || "")
      setSyncToExpenses(itemToEdit.syncToExpenses || false)
    } else {
      if (isReadOnly) return
      const defaultDate = getTodayInputDate()
      setEditingItem(null)
      setItemDate(defaultDate)
      
      setItemCategory(prefillCategory || (selectedRoom !== "All Rooms" ? selectedRoom : "Kitchen"))
      
      setItemNotes("")
      setItemUrl("")
      setItemPhotos([])
      setLinkTitle("")
      setLinkDescription("")
      setLinkDomain("")
      setLinkImage("")
      
      setIsPromoted(false)
      setMaterialCategory("Plumbing Fixtures")
      setEstimatedPrice("")
      setSyncToExpenses(false)
    }
    setIsModalOpen(true)
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly || !e.target.files) return
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
    if (isReadOnly) return
    setItemPhotos((prev) => (prev || []).filter((_, i) => i !== index))
  }

  const handleSaveItem = async () => {
    if (isReadOnly || (!itemNotes.trim() && (itemPhotos || []).length === 0 && !itemUrl.trim())) return
    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      const finalId = editingItem ? editingItem.id : Date.now()
      const finalIdStr = finalId.toString()

      const updatedItem: VisionBoardItem = {
        id: finalId,
        date: itemDate,
        category: itemCategory,
        notes: itemNotes,
        url: itemUrl.trim(),
        photos: itemPhotos || [],
        linkTitle,
        linkDescription,
        linkDomain,
        linkImage,
        isPromoted,
        materialCategory: isPromoted ? materialCategory : undefined,
        estimatedPrice: isPromoted ? estimatedPrice : undefined,
        syncToExpenses: isPromoted ? syncToExpenses : false
      }

      let updatedItems: VisionBoardItem[] = []
      if (editingItem) {
        updatedItems = (boardItems || []).map((l) => l.id === finalId ? updatedItem : l)
      } else {
        updatedItems = [updatedItem, ...(boardItems || [])]
      }
      
      await setBoardItems(updatedItems)

      if (isPromoted) {
        const selectionTitle = linkTitle || updatedItem.notes.split('\n')[0].substring(0, 30) || "Vision Board Item"
        const selectionPhoto = linkImage || (updatedItem.photos.length > 0 ? updatedItem.photos[0] : undefined)
        
        const newSelection: SelectionItem = {
          id: finalIdStr,
          title: selectionTitle,
          room: itemCategory,
          category: materialCategory,
          status: "Selected",
          vendorUrl: itemUrl,
          price: estimatedPrice,
          modelNumber: "",
          notes: itemNotes,
          photoUrl: selectionPhoto,
          checked: syncToExpenses,
          syncToExpenses: syncToExpenses
        }
        
        const existingSelections = selections || []
        const exists = existingSelections.some(s => s.id === finalIdStr)
        const updatedSelectionsList = exists
          ? existingSelections.map(s => s.id === finalIdStr ? newSelection : s)
          : [newSelection, ...existingSelections]

        await setSelections(updatedSelectionsList)

        if (syncToExpenses && estimatedPrice) {
          const cost = parseFloat(estimatedPrice.replace(/[^0-9.]/g, '')) || 0
          if (cost > 0) {
            const newExpense: ExpenseItem = {
              id: finalId,
              date: itemDate,
              description: `Selection: ${selectionTitle} (${itemCategory})`,
              materials: cost,
              labor: 0
            }
            try {
              const existingExpenses = (await get<ExpenseItem[]>("cleanbuild_expenses")) || []
              const expExists = existingExpenses.some(e => e.id === finalId)
              const updatedExpensesList = expExists
                ? existingExpenses.map(e => e.id === finalId ? newExpense : e)
                : [newExpense, ...existingExpenses]

              await set("cleanbuild_expenses", updatedExpensesList)
              setExpenses(updatedExpensesList)
              await syncManager.pushToCloud("cleanbuild_expenses", updatedExpensesList)
              if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("expenses-updated"))
              }
            } catch (err) {
              console.error("Failed to sync expense:", err)
            }
          }
        } else if (!syncToExpenses) {
          try {
            const existingExpenses = (await get<ExpenseItem[]>("cleanbuild_expenses")) || []
            const updatedExpensesList = existingExpenses.filter(e => e.id !== finalId)
            await set("cleanbuild_expenses", updatedExpensesList)
            setExpenses(updatedExpensesList)
            await syncManager.pushToCloud("cleanbuild_expenses", updatedExpensesList)
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("expenses-updated"))
            }
          } catch (err) {
            console.error("Failed to unsync expense:", err)
          }
        }

      } else {
        const updatedSelectionsList = (selections || []).filter(s => s.id !== finalIdStr)
        await setSelections(updatedSelectionsList)

        try {
          const existingExpenses = (await get<ExpenseItem[]>("cleanbuild_expenses")) || []
          const updatedExpensesList = existingExpenses.filter(e => e.id !== finalId)
          await set("cleanbuild_expenses", updatedExpensesList)
          setExpenses(updatedExpensesList)
          await syncManager.pushToCloud("cleanbuild_expenses", updatedExpensesList)
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("expenses-updated"))
          }
        } catch (err) {
          console.error("Failed to remove expense:", err)
        }
      }

      setIsModalOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteItem = async () => {
    if (isReadOnly || !editingItem) return
    
    const finalId = editingItem.id
    const finalIdStr = finalId.toString()

    const updatedItems = (boardItems || []).filter((l) => l.id !== finalId)
    await setBoardItems(updatedItems)
    
    const updatedSelectionsList = (selections || []).filter(s => s.id !== finalIdStr)
    await setSelections(updatedSelectionsList)
    
    try {
      const existingExpenses = (await get<ExpenseItem[]>("cleanbuild_expenses")) || []
      const updatedExpensesList = existingExpenses.filter(e => e.id !== finalId)
      await set("cleanbuild_expenses", updatedExpensesList)
      setExpenses(updatedExpensesList)
      await syncManager.pushToCloud("cleanbuild_expenses", updatedExpensesList)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("expenses-updated"))
      }
    } catch (err) {
      console.error("Failed to delete expense:", err)
    }
    
    setIsModalOpen(false) 
  }

  if (!isMounted) return null

  return (
    <main className={`p-6 bg-slate-100 flex flex-col text-slate-950 relative ${showPaywall ? 'h-screen overflow-hidden' : 'min-h-screen space-y-6'}`}>
      
      <PaywallOverlay show={showPaywall} />
      <PageTour steps={VISION_BOARD_TOUR_STEPS} tourKey="vision_board_tour" />

      {/* Target: tour-vision-header with Minimalist Dropdown */}
      <div className="tour-vision-header bg-slate-900 text-white p-6 md:px-8 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:min-h-[140px] shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              📷 Vision Board {isReadOnly && <span className="text-sm bg-slate-700 px-2 py-1 rounded-md text-slate-300 font-semibold ml-2">Read-Only</span>}
            </h1>
          </div>
          <p className="text-sm font-medium text-orange-400 mt-1.5 leading-relaxed max-w-2xl">
            {isReadOnly ? "View the project inspiration and ideas." : "Organize inspiration, materials, paint colors, and design ideas into visual categories."}
          </p>
        </div>

        {/* Minimalist Action Layout */}
        <div className="flex items-center justify-end w-full md:w-auto gap-2 shrink-0 mt-2 md:mt-0">
          
          {!isReadOnly && (
            <Button
              size="sm"
              onClick={() => handleOpenModal()}
              className="tour-vision-add bg-blue-600 hover:bg-blue-500 text-white h-9 text-xs font-semibold px-4 shadow-sm"
            >
              + Add Photos / Idea
            </Button>
          )}

          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOptionsOpen(!isOptionsOpen)}
              className="text-slate-300 border-slate-700 bg-slate-800/80 hover:bg-slate-700 hover:text-white h-9 w-9 p-0 flex items-center justify-center shadow-sm transition-colors"
              title="More Options"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </Button>

            {isOptionsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsOptionsOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                  
                  {(filteredItems || []).length > 0 && (
                    <button
                      onClick={() => {
                        setIsOptionsOpen(false)
                        handleExportAll()
                      }}
                      disabled={isExporting}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <span>📦</span> {isExporting ? "Exporting..." : "Download All"}
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      setIsOptionsOpen(false)
                      window.dispatchEvent(new Event('restart-tour-vision_board_tour'))
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-orange-500 flex items-center gap-2 transition-colors"
                  >
                    <span>💡</span> Replay Tutorial
                  </button>
                </div>
              </>
            )}
          </div>
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
            <div className="tour-vision-folders md:col-span-3 space-y-2">
              <div className="bg-white p-3 rounded-xl border shadow-sm space-y-1">
                
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider px-2 block mb-2">
                  Filter by Room
                </span>
                
                {(rooms || []).map((cat) => {
                  const catCount = cat === "All Rooms" 
                    ? (combinedItems || []).length 
                    : (combinedItems || []).filter((l) => (l?.category || "Kitchen") === cat).length
                  
                  const isActive = selectedRoom === cat
                  const isProtectedFolder = cat === "All Rooms"

                  return (
                    <div 
                      key={cat} 
                      className={`w-full flex items-center justify-between rounded-lg transition-all group ${
                        isActive ? "bg-slate-900 text-white shadow-sm" : "hover:bg-slate-100"
                      }`}
                    >
                      <button
                        onClick={() => setSelectedRoom(cat)}
                        className={`flex-1 flex items-center justify-between px-3 py-2 text-xs font-semibold text-left truncate ${
                          isActive ? "text-white" : "text-slate-600"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                            isActive ? "bg-slate-700 text-slate-200" : "bg-slate-200 text-slate-500"
                          }`}>
                            {catCount}
                          </span>
                          <span className="truncate">{cat}</span>
                        </div>
                      </button>
                      
                      {!isReadOnly && cat !== "All Rooms" && (
                        <div className="flex items-center gap-0.5 pr-1.5 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenModal(null, cat);
                            }}
                            className={`h-6 w-6 rounded flex items-center justify-center font-bold text-lg leading-none transition-colors ${
                              isActive 
                                ? "text-orange-400 hover:bg-slate-700 hover:text-orange-300" 
                                : "text-orange-500 hover:bg-orange-100 hover:text-orange-600"
                            }`}
                            title={`Add to ${cat}`}
                          >
                            +
                          </button>

                          {!isProtectedFolder && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenDeleteCategory(cat)
                              }}
                              className={`h-6 w-6 rounded flex items-center justify-center transition-colors ${
                                isActive 
                                  ? "text-slate-400 hover:bg-rose-500 hover:text-white" 
                                  : "text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-rose-100 hover:text-rose-600"
                              }`}
                              title={`Delete ${cat}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {isAddingCategory ? (
                  <div className="flex flex-col gap-2 mt-2 px-1 py-1">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="New room name..."
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
                      <Button type="button" size="sm" onClick={handleAddCategory} className="flex-1 h-7 text-[10px] bg-blue-600 hover:bg-blue-500 text-white">
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
                  !isReadOnly && (
                    <div className="pt-2 px-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(true)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-dashed border-slate-300"
                      >
                        + Add Custom Room
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="md:col-span-9">
              {(filteredItems || []).length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl text-slate-400 text-sm border-2 border-dashed border-slate-200 shadow-sm">
                  No images or ideas found in this room.<br />
                  {!isReadOnly && <span>Click <strong>"+ Add Photos / Idea"</strong> to start building your vision board.</span>}
                </div>
              ) : (
                <div className="space-y-6">
                  {(filteredItems || []).map((item) => (
                    <Card key={item.id} className={`p-5 border shadow-sm bg-white overflow-hidden transition-all ${item.isPromoted ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-slate-200'}`}>
                      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
                        <div className="space-y-3 flex-1 w-full">
                          
                          <div className="flex flex-wrap items-center gap-2">
                            {item.isPromoted && (
                              <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold shadow-xs">
                                ✅ Selected
                              </Badge>
                            )}
                            
                            <Badge className="bg-slate-900 text-white hover:bg-slate-800 text-[10px]">
                              📅 Added: {formatDisplayDate(item.date)}
                            </Badge>
                            
                            <Badge variant="outline" className="text-indigo-700 border-indigo-200 bg-indigo-50 text-[10px]">
                              📁 {item.category || "Kitchen"}
                            </Badge>
                            
                            {item.isPromoted && item.estimatedPrice && (
                              <Badge variant="outline" className="text-slate-600 border-slate-200 bg-slate-50 text-[10px] font-semibold">
                                💰 {item.estimatedPrice}
                              </Badge>
                            )}
                          </div>

                          {item.notes && (
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                              {item.notes}
                            </p>
                          )}

                          {item.url && (
                            <div className="pt-2">
                              {item.linkTitle || item.linkImage ? (
                                <a 
                                  href={item.url.startsWith("http") ? item.url : `https://${item.url}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="block border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow max-w-sm bg-slate-50 group cursor-pointer decoration-transparent"
                                >
                                  {item.linkImage && (
                                    <div className="h-40 w-full overflow-hidden bg-white border-b border-slate-200 flex items-center justify-center p-2">
                                      <img src={item.linkImage} alt={item.linkTitle || "Link preview"} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500" />
                                    </div>
                                  )}
                                  <div className="p-3">
                                    <h4 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">{item.linkTitle || item.url}</h4>
                                    <p className="text-[11px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">{item.linkDomain}</p>
                                  </div>
                                </a>
                              ) : (
                                <a
                                  href={item.url.startsWith("http") ? item.url : `https://${item.url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex text-indigo-600 hover:text-indigo-800 font-bold items-center gap-1.5 text-xs bg-indigo-50/50 py-1.5 px-3 rounded-md border border-indigo-100 transition-colors"
                                >
                                  🔗 Open Reference Link ↗
                                </a>
                              )}
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
                            className="h-8 px-4 text-[11px] font-bold text-indigo-700 border-indigo-200 hover:bg-indigo-50 shadow-sm"
                            disabled={isExporting}
                            onClick={() => handleExportItemAndPhotos(item)}
                            title="Export PDF & Photos"
                          >
                            📥 Export
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleOpenModal(item)}
                            className={`h-8 px-4 text-[11px] text-white font-bold rounded-md shadow-sm shrink-0 ${isReadOnly ? "bg-slate-600 hover:bg-slate-500" : "bg-blue-600 hover:bg-blue-500"}`}
                          >
                            {isReadOnly ? "View" : "Edit"}
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

      {/* DELETE CATEGORY MODAL */}
      <Dialog open={isCategoryDeleteModalOpen} onOpenChange={setIsCategoryDeleteModalOpen}>
        <DialogContent className="sm:max-w-[440px] bg-white text-slate-900 border-2 border-slate-900 rounded-xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 bg-slate-900 border-b border-slate-800 shrink-0">
            <DialogTitle className="text-lg font-bold text-rose-500">
              Delete Folder
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300 mt-1">
              You are about to delete <strong className="text-white">"{categoryToDelete}"</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5 bg-white space-y-4">
            {(() => {
              const itemsInFolder = (boardItems || []).filter(i => i.category === categoryToDelete).length;
              
              if (itemsInFolder === 0) {
                return (
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">
                    This folder is completely empty. Are you sure you want to delete it?
                  </p>
                )
              }

              return (
                <>
                  <p className="text-sm text-slate-600 font-medium mb-3">
                    There are <strong>{itemsInFolder} item(s)</strong> saved in this folder. What would you like to do with them?
                  </p>
                  
                  <div className="grid gap-3">
                    <label className={`flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-colors ${categoryDeleteMode === 'move' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-white hover:border-blue-200'}`}>
                      <div className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          name="delete_mode" 
                          checked={categoryDeleteMode === 'move'} 
                          onChange={() => setCategoryDeleteMode('move')}
                          className="h-4 w-4 accent-blue-600"
                        />
                        <span className="text-sm font-bold text-slate-900">Keep items and move them to:</span>
                      </div>
                      
                      {categoryDeleteMode === 'move' && (
                        <div className="pl-6 pt-2">
                          <select
                            value={categoryMoveTarget}
                            onChange={(e) => setCategoryMoveTarget(e.target.value)}
                            className="flex w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {(rooms || []).filter(c => c !== "All Rooms" && c !== categoryToDelete).map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </label>

                    <label className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${categoryDeleteMode === 'delete' ? 'border-rose-500 bg-rose-50/50' : 'border-slate-200 bg-white hover:border-rose-200'}`}>
                      <input 
                        type="radio" 
                        name="delete_mode" 
                        checked={categoryDeleteMode === 'delete'} 
                        onChange={() => setCategoryDeleteMode('delete')}
                        className="h-4 w-4 accent-rose-600"
                      />
                      <span className="text-sm font-bold text-slate-900">Permanently delete all {itemsInFolder} item(s)</span>
                    </label>
                  </div>
                </>
              )
            })()}
          </div>

          <div className="flex gap-2 p-6 pt-4 border-t border-slate-100 bg-white shrink-0">
            <Button 
              size="sm" 
              onClick={handleConfirmCategoryDelete}
              className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-sm h-9" 
            >
              Confirm Delete
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsCategoryDeleteModalOpen(false)} 
              className="flex-1 shadow-sm font-semibold text-slate-700 hover:bg-slate-100 h-9"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[550px] bg-white text-slate-900 border-2 border-slate-900 rounded-xl [&>button]:text-slate-400 hover:[&>button]:text-white p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="px-6 py-5 bg-slate-900 border-b border-slate-800 shrink-0">
            <DialogTitle className="text-lg font-bold text-orange-400">
              {isReadOnly ? "View Board Entry" : editingItem ? "Edit Board Entry" : "Add Photos / Idea"}
            </DialogTitle>
            {!isReadOnly && (
              <DialogDescription className="text-xs text-slate-300 mt-1">
                Upload photos to your vision board, tag the category, and add any design notes.
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-white">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="item-date" className="block mb-1 font-semibold text-slate-700 text-xs">Date Added</label>
                <Input
                  id="item-date"
                  type="date"
                  value={itemDate}
                  disabled={isReadOnly}
                  onChange={(e) => setItemDate(e.target.value)}
                  className={`h-9 text-sm shadow-sm ${isReadOnly ? "opacity-80 font-medium text-slate-900" : ""}`}
                />
              </div>

              <div>
                <label htmlFor="item-category" className="block mb-1 font-semibold text-slate-700 text-xs">Room / Area</label>
                <select
                  id="item-category"
                  value={itemCategory}
                  disabled={isReadOnly}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className={`flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadOnly ? "opacity-80 font-medium text-slate-900" : ""}`}
                >
                  {(rooms || []).filter(c => c !== "All Rooms").map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="item-url" className="font-semibold text-slate-700 text-xs">Reference Link / URL</label>
                {isFetchingPreview && <span className="text-[10px] text-blue-600 font-bold animate-pulse">Fetching link preview...</span>}
              </div>
              <Input
                id="item-url"
                placeholder="e.g. https://homedepot.com/..."
                value={itemUrl}
                disabled={isReadOnly}
                onChange={(e) => {
                  setItemUrl(e.target.value)
                  setFetchError(false)
                  setLinkTitle("")
                  setLinkImage("")
                  setLinkDomain("")
                  setLinkDescription("")
                }}
                className={`h-9 text-sm bg-white shadow-sm border-slate-200 w-full ${isReadOnly ? "opacity-80 font-medium text-slate-900" : ""}`}
              />

              {fetchError && !isReadOnly && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-3 shadow-sm">
                  <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                    ⚠️ <strong>{linkDomain || "This retailer"}</strong> blocked our automatic preview bot. To create your image card, please paste the details manually below:
                  </p>
                  <div className="grid gap-2">
                    <Input 
                      placeholder="Product Title (e.g. Ceiling Fan)" 
                      value={linkTitle} 
                      onChange={e => setLinkTitle(e.target.value)} 
                      className="h-8 text-xs bg-white border-amber-200 shadow-sm" 
                    />
                    <Input 
                      placeholder="Image Address (Right-click photo -> Copy Image Address)" 
                      value={linkImage} 
                      onChange={e => setLinkImage(e.target.value)} 
                      className="h-8 text-xs bg-white border-amber-200 shadow-sm" 
                    />
                  </div>
                </div>
              )}

              {(linkTitle || linkImage) && !fetchError && (
                <div className="mt-2 relative border border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex items-center gap-3 pr-2 h-16 shadow-sm">
                  {linkImage ? (
                    <div className="h-16 w-16 bg-white shrink-0 flex items-center justify-center p-1 border-r border-slate-200">
                      <img src={linkImage} className="max-h-full max-w-full object-contain" alt="Link preview thumbnail" />
                    </div>
                  ) : (
                    <div className="h-16 w-16 bg-slate-200 shrink-0 flex items-center justify-center text-xl">🔗</div>
                  )}
                  <div className="flex-1 overflow-hidden py-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{linkTitle}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider truncate mt-0.5">{linkDomain}</p>
                  </div>
                  {!isReadOnly && (
                    <button 
                      type="button" 
                      onClick={() => { setLinkTitle(""); setLinkImage(""); setLinkDomain(""); setLinkDescription(""); setFetchError(false); }} 
                      className="h-6 w-6 shrink-0 bg-slate-200 hover:bg-rose-100 hover:text-rose-600 text-slate-500 rounded flex items-center justify-center transition-colors shadow-sm"
                      title="Clear Preview"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="item-notes" className="block mb-1 font-semibold text-slate-700 text-xs">Idea Summary & Notes</label>
              <textarea
                id="item-notes"
                rows={3}
                placeholder="Describe this idea, color code, or inspiration..."
                value={itemNotes}
                disabled={isReadOnly}
                onChange={(e) => setItemNotes(e.target.value)}
                className={`flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadOnly ? "opacity-80 font-medium text-slate-900" : ""}`}
              />
            </div>
            
            <div className="border-t border-slate-100 pt-3 mt-1">
              <label className="block mb-1 font-semibold text-slate-700 text-xs">Attached Board Photos</label>
              
              {!isReadOnly && (
                <div className="flex gap-2 mt-1">
                  <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-2 px-3 rounded-md shadow-sm font-semibold text-xs transition-colors h-9">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                    Camera
                    <input type="file" accept="image/*" capture="environment" multiple onChange={handlePhotoUpload} className="hidden" />
                  </label>

                  <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-2 px-3 rounded-md shadow-sm font-semibold text-xs transition-colors h-9">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                    Upload File
                    <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                  </label>
                </div>
              )}

              {(!itemPhotos || itemPhotos.length === 0) && isReadOnly ? (
                <p className="text-sm text-slate-500 italic">No photos attached.</p>
              ) : (
                <div className={`grid grid-cols-5 sm:grid-cols-6 gap-2 ${!isReadOnly ? "mt-2" : ""}`}>
                  {(itemPhotos || []).map((p, index) => (
                    <div key={index} className="relative group aspect-square rounded border border-slate-200 overflow-hidden shadow-sm">
                      <img
                        src={p}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(index)}
                          className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 hover:bg-rose-600 transition-all"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!isReadOnly && (
              <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl overflow-hidden mt-2">
                <label className="flex items-center gap-3 p-3.5 cursor-pointer hover:bg-emerald-50 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={isPromoted}
                    onChange={(e) => setIsPromoted(e.target.checked)}
                    className="h-5 w-5 accent-emerald-600 rounded shrink-0"
                  />
                  <div>
                    <span className="text-sm font-bold text-emerald-900 block">Promote to Official Selection</span>
                    <span className="text-[10px] font-semibold text-emerald-700 block mt-0.5">Automatically copies this item to the Selections tab.</span>
                  </div>
                </label>

                {isPromoted && (
                  <div className="p-4 pt-0 space-y-4 border-t border-emerald-100 bg-white">
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase">Material Category</label>
                        <select
                          value={materialCategory}
                          onChange={(e) => setMaterialCategory(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {MATERIAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase">Estimated Price</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-sm">$</span>
                          <Input
                            placeholder="0.00"
                            value={estimatedPrice}
                            onChange={(e) => setEstimatedPrice(e.target.value)}
                            className="pl-7 h-9 text-sm bg-white shadow-sm border-slate-200"
                          />
                        </div>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <input 
                        type="checkbox" 
                        checked={syncToExpenses}
                        onChange={(e) => setSyncToExpenses(e.target.checked)}
                        className="h-4 w-4 accent-blue-600 rounded shrink-0"
                      />
                      <span className="text-xs font-semibold text-slate-700">Sync cost to Project Expenses</span>
                    </label>
                  </div>
                )}
              </div>
            )}

          </div>

          <div className="flex flex-col gap-2 p-6 pt-4 border-t border-slate-100 bg-white items-center shrink-0">
            {isReadOnly ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsModalOpen(false)} 
                className="w-full shadow-sm font-semibold text-slate-700 hover:bg-slate-100 h-9"
              >
                Close View
              </Button>
            ) : (
              <>
                <div className="flex gap-2 w-full">
                  <Button 
                    size="sm" 
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm h-9" 
                    onClick={handleSaveItem}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : editingItem ? "Save Changes" : "Save to Board"}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsModalOpen(false)} 
                    className="flex-1 shadow-sm font-semibold text-slate-700 hover:bg-slate-100 h-9"
                  >
                    Cancel
                  </Button>
                </div>

                {editingItem && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleDeleteItem} 
                    className="w-full shadow-sm bg-rose-600 hover:bg-rose-500 text-white font-bold h-9"
                  >
                    Delete
                  </Button>
                )}
              </>
            )}
          </div>
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
                <span className="text-slate-500 block font-medium">Room</span>
                <span className="font-semibold">{exportTarget.category || "Kitchen"}</span>
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