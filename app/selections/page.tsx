"use client"

import { useState, useMemo, useEffect } from "react"
import { get, set } from "idb-keyval"
import { syncManager } from "@/lib/syncManager"
import { useOfflineSync } from "@/hooks/useOfflineSync"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { PaywallOverlay } from "@/components/paywall-overlay"

export interface SelectionItem {
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
}

interface ExpenseItem {
  id: number
  description?: string
  materials: number
  labor: number
  date?: string
}

const DEFAULT_CATEGORIES = [
  "All Categories",
  "Plumbing Fixtures",
  "Tile & Flooring",
  "Lighting & Electrical",
  "Appliances",
  "Paint & Finishes",
  "Cabinetry & Hardware",
  "Doors & Trim",
  "Other",
]

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

const INITIAL_SELECTIONS: SelectionItem[] = [
  {
    id: "1",
    title: "Matte Black Rain Showerhead Set",
    category: "Plumbing Fixtures",
    room: "Master Bathroom",
    vendorUrl: "https://www.build.com",
    price: "289.00",
    modelNumber: "KOH-K-22169-BL",
    notes: "Requires rough-in valve body #K-8304.",
    status: "Selected",
    checked: true,
    syncToExpenses: false,
  },
  {
    id: "2",
    title: "12x24 Porcelain Tile - Cement Gray",
    category: "Tile & Flooring",
    room: "Master Bathroom",
    vendorUrl: "https://www.homedepot.com",
    price: "767.80",
    modelNumber: "HD-PORC-1224-GY",
    notes: "Ordered 15% extra for waste/cuts (220 sqft total).",
    status: "Ordered",
    checked: true,
    syncToExpenses: false,
  },
  {
    id: "3",
    title: "60-inch Double Vanity in Navy Blue",
    category: "Cabinetry & Hardware",
    room: "Master Bathroom",
    vendorUrl: "https://www.wayfair.com",
    price: "1150.00",
    modelNumber: "WF-VAN-60-NV",
    notes: "Includes quartz countertop & undermount sinks.",
    status: "Delivered",
    checked: false,
    syncToExpenses: false,
  },
  {
    id: "4",
    title: "Brushed Brass Vanity Sconce Lights (Pair)",
    category: "Lighting & Electrical",
    room: "Powder Room",
    vendorUrl: "https://www.amazon.com",
    price: "145.00",
    modelNumber: "B08X3P912",
    notes: "Checking warm white 3000K LED compatibility.",
    status: "Under Review",
    checked: false,
    syncToExpenses: false,
  },
]

export default function SelectionsPage() {
  const [isMounted, setIsMounted] = useState(false)
  const [items, setItems] = useOfflineSync<SelectionItem[]>("cleanbuild_selections_items", INITIAL_SELECTIONS)
  
  // Dynamic Rooms & Categories
  const [categories, setCategories] = useOfflineSync<string[]>("cleanbuild_selections_categories_list", DEFAULT_CATEGORIES)
  const [rooms, setRooms] = useOfflineSync<string[]>("cleanbuild_selections_rooms_list", DEFAULT_ROOMS)
  
  const [categoryBudgets, setCategoryBudgets] = useOfflineSync<Record<string, number>>("cleanbuild_selections_budgets", {
    "Plumbing Fixtures": 500,
    "Tile & Flooring": 800,
    "Lighting & Electrical": 300,
    "Cabinetry & Hardware": 1200,
  })

  // Auth, Permissions & Billing State
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("")
  const [isGuest, setIsGuest] = useState(false)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [accountTier, setAccountTier] = useState<string>("free")
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  const [selectedCategory, setSelectedCategory] = useState<string>("All Categories")
  const [selectedRoom, setSelectedRoom] = useState<string>("All Rooms")
  
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Custom Adding States
  const [isAddingRoom, setIsAddingRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState("")
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")

  // Deleting States
  const [isRoomDeleteModalOpen, setIsRoomDeleteModalOpen] = useState(false)
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null)
  const [roomDeleteMode, setRoomDeleteMode] = useState<"move" | "delete">("move")
  const [roomMoveTarget, setRoomMoveTarget] = useState<string>("Kitchen")

  const [isCategoryDeleteModalOpen, setIsCategoryDeleteModalOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)
  const [categoryDeleteMode, setCategoryDeleteMode] = useState<"move" | "delete">("move")
  const [categoryMoveTarget, setCategoryMoveTarget] = useState<string>("Plumbing Fixtures")

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)
  const [tempBudgetVal, setTempBudgetVal] = useState("")

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [editingItem, setEditingItem] = useState<SelectionItem | null>(null)

  const [formTitle, setFormTitle] = useState("")
  const [formCategory, setFormCategory] = useState("Plumbing Fixtures")
  const [formRoom, setFormRoom] = useState("Kitchen")
  const [formUrl, setFormUrl] = useState("")
  const [formPrice, setFormPrice] = useState("")
  const [formModel, setFormModel] = useState("")
  const [formNotes, setFormNotes] = useState("")
  const [formStatus, setFormStatus] = useState<SelectionItem["status"]>("Idea / Saved")
  const [formSyncToExpenses, setFormSyncToExpenses] = useState<boolean>(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Self-Healing Sync: Ensures "All Rooms" and "All Categories" are always present at index 0
  useEffect(() => {
    if (isMounted) {
      if (rooms && rooms[0] !== "All Rooms") {
        const fixed = ["All Rooms", ...rooms.filter(r => r !== "All Rooms")]
        setRooms(fixed)
      }
      if (categories && categories[0] !== "All Categories") {
        const fixed = ["All Categories", ...categories.filter(c => c !== "All Categories")]
        setCategories(fixed)
      }
    }
  }, [isMounted, rooms, categories, setRooms, setCategories])

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

          if (guestInvite?.permissions) {
            setIsReadOnly(guestInvite.permissions.selections === "read-only")
          }
        }
      } catch (error) {
        console.error("Failed to load selections permissions:", error)
      } finally {
        setIsCheckingAuth(false)
      }
    }
    fetchUserAndPermissions()
  }, [])

  const showPaywall = !isCheckingAuth && !isGuest && accountTier === "free"

  const extractPrice = (priceStr: string) => {
    if (!priceStr) return 0
    const rawNum = parseFloat(priceStr.replace(/[^0-9.]/g, ""))
    return isNaN(rawNum) ? 0 : rawNum
  }

  const checkedCount = useMemo(() => items.filter((i) => i.checked).length, [items])

  const totalCost = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.checked ? extractPrice(item.price) : 0), 0)
  }, [items])

  const activeCategoryCost = useMemo(() => {
    if (selectedCategory === "All Categories") return totalCost
    return items.reduce((sum, item) => {
      if (item.category !== selectedCategory || !item.checked) return sum
      return sum + extractPrice(item.price)
    }, 0)
  }, [items, selectedCategory, totalCost])

  const handleToggleCheck = async (id: string) => {
    if (isReadOnly) return
    const updatedItems = items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i))
    await setItems(updatedItems)
  }

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = selectedCategory === "All Categories" || item.category === selectedCategory
      const matchesRoom = selectedRoom === "All Rooms" || (item.room || "Other") === selectedRoom
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.modelNumber.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesRoom && matchesSearch
    })
  }, [items, selectedCategory, selectedRoom, searchQuery])

  // --- Custom Rooms & Categories Handlers ---
  const handleAddRoom = async () => {
    if (isReadOnly || !newRoomName.trim()) return
    const trimmed = newRoomName.trim()
    if (!rooms.includes(trimmed)) {
      await setRooms([...rooms, trimmed])
    }
    setNewRoomName("")
    setIsAddingRoom(false)
    setSelectedRoom(trimmed)
  }

  const handleAddCategory = async () => {
    if (isReadOnly || !newCategoryName.trim()) return
    const trimmed = newCategoryName.trim()
    if (!categories.includes(trimmed)) {
      await setCategories([...categories, trimmed])
    }
    setNewCategoryName("")
    setIsAddingCategory(false)
    setSelectedCategory(trimmed)
  }

  // --- Delete Handlers ---
  const handleOpenDeleteRoom = (room: string) => {
    setRoomToDelete(room)
    const availableFallbacks = rooms.filter(r => r !== "All Rooms" && r !== room)
    setRoomMoveTarget(availableFallbacks.includes("Kitchen") ? "Kitchen" : availableFallbacks[0] || "")
    setRoomDeleteMode("move")
    setIsRoomDeleteModalOpen(true)
  }

  const handleConfirmRoomDelete = async () => {
    if (isReadOnly || !roomToDelete) return

    let updatedItems = [...items]
    const itemsInRoom = updatedItems.filter(item => (item.room || "Other") === roomToDelete)

    if (itemsInRoom.length > 0) {
      if (roomDeleteMode === "delete") {
        const idsToDelete = new Set(itemsInRoom.map(i => i.id))
        updatedItems = updatedItems.filter(item => !idsToDelete.has(item.id))
        
        // Clean up expenses 
        try {
           const existingExpenses = (await get<ExpenseItem[]>("cleanbuild_expenses")) || []
           const filteredExpenses = existingExpenses.filter(e => !idsToDelete.has(e.id.toString()))
           await set("cleanbuild_expenses", filteredExpenses)
           await syncManager.pushToCloud("cleanbuild_expenses", filteredExpenses)
           window.dispatchEvent(new Event("expenses-updated"))
        } catch (err) {}
      } else if (roomDeleteMode === "move" && roomMoveTarget) {
        updatedItems = updatedItems.map(item => 
          (item.room || "Other") === roomToDelete ? { ...item, room: roomMoveTarget } : item
        )
      }
    }
    await setItems(updatedItems)
    await setRooms(rooms.filter(r => r !== roomToDelete))
    if (selectedRoom === roomToDelete) setSelectedRoom("All Rooms")
    setIsRoomDeleteModalOpen(false)
    setRoomToDelete(null)
  }

  const handleOpenDeleteCategory = (cat: string) => {
    setCategoryToDelete(cat)
    const availableFallbacks = categories.filter(c => c !== "All Categories" && c !== cat)
    setCategoryMoveTarget(availableFallbacks.includes("Plumbing Fixtures") ? "Plumbing Fixtures" : availableFallbacks[0] || "")
    setCategoryDeleteMode("move")
    setIsCategoryDeleteModalOpen(true)
  }

  const handleConfirmCategoryDelete = async () => {
    if (isReadOnly || !categoryToDelete) return

    let updatedItems = [...items]
    const itemsInCat = updatedItems.filter(item => item.category === categoryToDelete)

    if (itemsInCat.length > 0) {
      if (categoryDeleteMode === "delete") {
        const idsToDelete = new Set(itemsInCat.map(i => i.id))
        updatedItems = updatedItems.filter(item => !idsToDelete.has(item.id))

        // Clean up expenses
        try {
           const existingExpenses = (await get<ExpenseItem[]>("cleanbuild_expenses")) || []
           const filteredExpenses = existingExpenses.filter(e => !idsToDelete.has(e.id.toString()))
           await set("cleanbuild_expenses", filteredExpenses)
           await syncManager.pushToCloud("cleanbuild_expenses", filteredExpenses)
           window.dispatchEvent(new Event("expenses-updated"))
        } catch (err) {}
      } else if (categoryDeleteMode === "move" && categoryMoveTarget) {
        updatedItems = updatedItems.map(item => 
          item.category === categoryToDelete ? { ...item, category: categoryMoveTarget } : item
        )
      }
    }
    await setItems(updatedItems)
    await setCategories(categories.filter(c => c !== categoryToDelete))
    if (selectedCategory === categoryToDelete) setSelectedCategory("All Categories")
    setIsCategoryDeleteModalOpen(false)
    setCategoryToDelete(null)
  }

  const handleSaveBudget = async () => {
    if (isReadOnly) return
    const num = parseFloat(tempBudgetVal) || 0
    const updatedBudgets = { ...categoryBudgets, [selectedCategory]: num }
    await setCategoryBudgets(updatedBudgets)
    setIsBudgetModalOpen(false)
  }

  // 🔥 Smart Add: Accepts pre-fills for the exact room/category
  const handleOpenAdd = (prefillRoom?: string | null, prefillCategory?: string | null) => {
    if (isReadOnly) return
    setIsSubmitting(false)
    setEditingItem(null)
    setFormTitle("")
    setFormCategory(prefillCategory || (selectedCategory !== "All Categories" ? selectedCategory : "Plumbing Fixtures"))
    setFormRoom(prefillRoom || (selectedRoom !== "All Rooms" ? selectedRoom : "Kitchen"))
    setFormUrl("")
    setFormPrice("")
    setFormModel("")
    setFormNotes("")
    setFormStatus("Idea / Saved")
    setFormSyncToExpenses(false)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: SelectionItem) => {
    setIsSubmitting(false)
    setEditingItem(item)
    setFormTitle(item.title)
    setFormCategory(item.category)
    setFormRoom(item.room || "Other")
    setFormUrl(item.vendorUrl)
    setFormPrice(item.price.replace(/[^0-9.]/g, "")) // strip $ for the input
    setFormModel(item.modelNumber)
    setFormNotes(item.notes)
    setFormStatus(item.status || "Idea / Saved")
    setFormSyncToExpenses(!!item.syncToExpenses)
    setIsModalOpen(true)
  }

  const handleSaveItem = async () => {
    if (isReadOnly || !formTitle.trim() || isSubmitting) return
    setIsSubmitting(true)

    try {
      const itemPriceNumber = extractPrice(formPrice)
      let updatedItem: SelectionItem

      if (editingItem) {
        updatedItem = {
          ...editingItem,
          title: formTitle.trim(),
          category: formCategory,
          room: formRoom,
          vendorUrl: formUrl.trim(),
          price: formPrice.trim(),
          modelNumber: formModel.trim(),
          notes: formNotes.trim(),
          status: formStatus,
          checked: formSyncToExpenses ? true : editingItem.checked,
          syncToExpenses: formSyncToExpenses,
        }
        const updatedItemsList = items.map((i) => (i.id === editingItem.id ? updatedItem : i))
        await setItems(updatedItemsList)
      } else {
        updatedItem = {
          id: Date.now().toString(),
          title: formTitle.trim(),
          category: formCategory,
          room: formRoom,
          vendorUrl: formUrl.trim(),
          price: formPrice.trim(),
          modelNumber: formModel.trim(),
          notes: formNotes.trim(),
          status: formStatus,
          checked: true,
          syncToExpenses: formSyncToExpenses,
        }
        const updatedItemsList = [updatedItem, ...items]
        await setItems(updatedItemsList)
      }

      // Sync to expenses logic
      if (formSyncToExpenses) {
        try {
          const existingExpenses = (await get<ExpenseItem[]>("cleanbuild_expenses")) || []
          const filteredExpenses = editingItem
            ? existingExpenses.filter((e) => e.id !== parseInt(editingItem.id))
            : existingExpenses

          const newExpenseRecord: ExpenseItem = {
            id: parseInt(updatedItem.id) || Date.now(),
            description: `Selection: ${updatedItem.title} (${updatedItem.room} - ${updatedItem.category})`,
            materials: itemPriceNumber,
            labor: 0,
            date: new Date().toISOString().split("T")[0],
          }

          const newExpenseList = [newExpenseRecord, ...filteredExpenses]
          await set("cleanbuild_expenses", newExpenseList)
          await syncManager.pushToCloud("cleanbuild_expenses", newExpenseList)
          window.dispatchEvent(new Event("expenses-updated"))
        } catch (err) {}
      } else if (editingItem && editingItem.syncToExpenses && !formSyncToExpenses) {
        try {
          const existingExpenses = (await get<ExpenseItem[]>("cleanbuild_expenses")) || []
          const filteredExpenses = existingExpenses.filter((e) => e.id !== parseInt(editingItem.id))
          await set("cleanbuild_expenses", filteredExpenses)
          await syncManager.pushToCloud("cleanbuild_expenses", filteredExpenses)
          window.dispatchEvent(new Event("expenses-updated"))
        } catch (err) {}
      }

      setIsModalOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteItem = async () => {
    if (isReadOnly || !editingItem) return
    const updatedItems = items.filter((i) => i.id !== editingItem.id)
    await setItems(updatedItems)
    try {
      const existingExpenses = (await get<ExpenseItem[]>("cleanbuild_expenses")) || []
      const filteredExpenses = existingExpenses.filter((e) => e.id !== parseInt(editingItem.id))
      await set("cleanbuild_expenses", filteredExpenses)
      await syncManager.pushToCloud("cleanbuild_expenses", filteredExpenses)
      window.dispatchEvent(new Event("expenses-updated"))
    } catch (err) {}
    setIsModalOpen(false)
  }

  const getStatusBadge = (status: SelectionItem["status"]) => {
    switch (status) {
      case "Idea / Saved": return <Badge className="bg-slate-100 text-slate-600 border-slate-200">Idea / Saved</Badge>
      case "Selected": return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Selected</Badge>
      case "Under Review": return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Under Review</Badge>
      case "Ordered": return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Ordered</Badge>
      case "Delivered": return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Delivered</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const currentCategoryAllowance = categoryBudgets[selectedCategory] || 0
  const allowanceDiff = currentCategoryAllowance - activeCategoryCost

  if (!isMounted) return null

  return (
    <main className={`p-6 bg-slate-100 flex flex-col text-slate-950 relative ${showPaywall ? 'h-screen overflow-hidden' : 'min-h-screen space-y-6'}`}>
      
      <PaywallOverlay show={showPaywall} />

      <div className="bg-slate-900 text-white p-6 md:px-8 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:h-[140px] shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              🛍️ Material Selections & Links {isReadOnly && <span className="text-sm bg-slate-700 px-2 py-1 rounded-md text-slate-300 font-semibold ml-2">Read-Only</span>}
            </h1>
          </div>
          <p className="text-sm font-medium text-orange-400 mt-1.5 leading-relaxed max-w-2xl">
            {isReadOnly ? "View the material selections and budget allowances." : "Organize selections by room and category. Check items to calculate totals and sync directly to your expenses."}
          </p>
        </div>

        <div className="flex items-center justify-center w-full md:w-auto gap-2 shrink-0">
          <div className="bg-slate-800/80 border border-slate-700 py-1.5 px-3 rounded-lg text-right">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Checked Total</span>
            <span className="text-base font-extrabold text-emerald-400">
              ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {!isReadOnly && (
            <Button
              size="sm"
              onClick={() => handleOpenAdd(null, null)}
              className="bg-blue-600 hover:bg-blue-500 text-white h-9 text-xs font-semibold px-4 shadow-sm"
            >
              + Add Item
            </Button>
          )}
        </div>
      </div>

      <Card className="overflow-hidden border shadow-sm bg-white flex-1">
        <div className="p-6 space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            <div className="md:col-span-1 space-y-4">
              
              {/* --- ROOMS FILTER --- */}
              <div className="bg-white p-3 rounded-xl border shadow-xs space-y-1">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider px-2 block mb-2">
                  Filter by Room
                </span>
                
                {rooms.map((rm) => {
                  const rmItems = rm === "All Rooms" ? items : items.filter((i) => (i.room || "Other") === rm)
                  const rmCount = rmItems.length
                  const rmCheckedCost = rmItems.reduce((sum, item) => sum + (item.checked ? extractPrice(item.price) : 0), 0)
                  const isActive = selectedRoom === rm
                  const isProtectedFolder = rm === "All Rooms"

                  return (
                    <div 
                      key={rm} 
                      className={`w-full flex items-center justify-between rounded-lg transition-all group ${
                        isActive ? "bg-slate-900 text-white shadow-sm" : "hover:bg-slate-100"
                      }`}
                    >
                      <button
                        onClick={() => setSelectedRoom(rm)}
                        className={`flex-1 flex items-center justify-between px-3 py-2 text-xs font-semibold text-left truncate ${
                          isActive ? "text-white" : "text-slate-600"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                            isActive ? "bg-slate-700 text-slate-200" : "bg-slate-200 text-slate-500"
                          }`}>
                            {rmCount}
                          </span>
                          <span className="truncate">{rm}</span>
                        </div>
                        <span className={`text-[10px] shrink-0 ml-2 ${isActive ? "text-emerald-400" : rmCheckedCost > 0 ? "text-emerald-600 font-bold" : "text-slate-400 font-medium"}`}>
                          ${rmCheckedCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </button>
                      
                      {/* 🔥 FOLDER ACTIONS GROUP */}
                      {!isReadOnly && !isProtectedFolder && (
                        <div className="flex items-center gap-0.5 pr-1.5 shrink-0">
                          {/* Quick Add Plus (FIRST, ALWAYS VISIBLE, ORANGE) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAdd(rm, null); 
                            }}
                            className={`h-6 w-6 rounded flex items-center justify-center font-bold text-lg leading-none transition-colors ${
                              isActive 
                                ? "text-orange-400 hover:bg-slate-700 hover:text-orange-300" 
                                : "text-orange-500 hover:bg-orange-100 hover:text-orange-600"
                            }`}
                            title={`Add to ${rm}`}
                          >
                            +
                          </button>

                          {/* Trash Can (SECOND, ONLY ON HOVER, RED) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenDeleteRoom(rm)
                            }}
                            className={`h-6 w-6 rounded flex items-center justify-center transition-colors ${
                              isActive 
                                ? "text-slate-400 hover:bg-rose-500 hover:text-white" 
                                : "text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-rose-100 hover:text-rose-600"
                            }`}
                            title={`Delete ${rm}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Add Custom Room */}
                {isAddingRoom ? (
                  <div className="flex flex-col gap-2 mt-2 px-1 py-1">
                    <Input
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="New room name..."
                      className="h-8 text-xs bg-slate-50 border-slate-300"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddRoom()
                        if (e.key === "Escape") {
                          setIsAddingRoom(false)
                          setNewRoomName("")
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={handleAddRoom} className="flex-1 h-7 text-[10px] bg-blue-600 hover:bg-blue-700 text-white">Save</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => { setIsAddingRoom(false); setNewRoomName(""); }} className="h-7 px-3 text-[10px] text-slate-500 hover:bg-slate-100">Cancel</Button>
                    </div>
                  </div>
                ) : (
                  !isReadOnly && (
                    <div className="pt-2 px-1">
                      <button type="button" onClick={() => setIsAddingRoom(true)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-dashed border-slate-300">
                        + Add Custom Room
                      </button>
                    </div>
                  )
                )}
              </div>

              {/* --- CATEGORIES FILTER --- */}
              <div className="bg-white p-3 rounded-xl border shadow-xs space-y-1">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider px-2 block mb-2 mt-2">
                  Filter by Category
                </span>
                
                {categories.map((cat) => {
                  const catItems = cat === "All Categories" ? items : items.filter((i) => i.category === cat)
                  const catCount = catItems.length
                  const catCheckedCost = catItems.reduce((sum, item) => sum + (item.checked ? extractPrice(item.price) : 0), 0)
                  const isActive = selectedCategory === cat
                  const isProtectedFolder = cat === "All Categories"

                  return (
                    <div 
                      key={cat} 
                      className={`w-full flex items-center justify-between rounded-lg transition-all group ${
                        isActive ? "bg-slate-900 text-white shadow-sm" : "hover:bg-slate-100"
                      }`}
                    >
                      <button
                        onClick={() => setSelectedCategory(cat)}
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
                        <span className={`text-[10px] shrink-0 ml-2 ${isActive ? "text-emerald-400" : catCheckedCost > 0 ? "text-emerald-600 font-bold" : "text-slate-400 font-medium"}`}>
                          ${catCheckedCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </button>
                      
                      {/* 🔥 FOLDER ACTIONS GROUP */}
                      {!isReadOnly && !isProtectedFolder && (
                        <div className="flex items-center gap-0.5 pr-1.5 shrink-0">
                          {/* Quick Add Plus (FIRST, ALWAYS VISIBLE, ORANGE) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAdd(null, cat); 
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

                          {/* Trash Can (SECOND, ONLY ON HOVER, RED) */}
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
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Add Custom Category */}
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
                      <Button type="button" size="sm" onClick={handleAddCategory} className="flex-1 h-7 text-[10px] bg-blue-600 hover:bg-blue-700 text-white">Save</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => { setIsAddingCategory(false); setNewCategoryName(""); }} className="h-7 px-3 text-[10px] text-slate-500 hover:bg-slate-100">Cancel</Button>
                    </div>
                  </div>
                ) : (
                  !isReadOnly && (
                    <div className="pt-2 px-1">
                      <button type="button" onClick={() => setIsAddingCategory(true)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-dashed border-slate-300">
                        + Add Custom Category
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="md:col-span-3 space-y-4">
              
              {selectedCategory !== "All Categories" && (
                <div className="bg-white p-4 rounded-xl border shadow-xs flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      {selectedCategory} Budget Target
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-lg font-bold text-slate-900">
                        Spent: ${activeCategoryCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      {currentCategoryAllowance > 0 && (
                        <span className="text-xs text-slate-500 font-medium">
                          / Target: ${currentCategoryAllowance.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {currentCategoryAllowance > 0 && (
                      <Badge className={`text-xs px-2.5 py-1 ${allowanceDiff < 0 ? "bg-rose-100 text-rose-800 border-rose-200" : "bg-emerald-100 text-emerald-800 border-emerald-200"}`}>
                        {allowanceDiff < 0
                          ? `Over Budget by $${Math.abs(allowanceDiff).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          : `$${allowanceDiff.toLocaleString(undefined, { minimumFractionDigits: 2 })} Remaining Target`}
                      </Badge>
                    )}

                    {!isReadOnly && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setTempBudgetVal(currentCategoryAllowance ? currentCategoryAllowance.toString() : "")
                          setIsBudgetModalOpen(true)
                        }}
                        className="h-8 text-[11px] px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-md shadow-sm"
                      >
                        Set Budget
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-white p-3 rounded-xl border shadow-xs flex gap-2">
                <Input
                  placeholder="Search items, model specs, notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 text-xs bg-slate-50 w-full"
                />
              </div>

              <div className="space-y-3">
                {filteredItems.map((item) => {
                  let cardStyle = "border-slate-200 hover:border-slate-300 shadow-xs bg-white"
                  if (item.syncToExpenses) {
                    cardStyle = "bg-emerald-50/80 border-emerald-500 ring-1 ring-emerald-500 shadow-xs"
                  } else if (item.checked) {
                    cardStyle = "bg-indigo-50/80 border-indigo-500 ring-1 ring-indigo-500 shadow-xs"
                  }

                  return (
                    <Card key={item.id} className={`transition-all ${cardStyle}`}>
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={item.checked}
                              disabled={isReadOnly}
                              onChange={() => handleToggleCheck(item.id)}
                              className={`mt-1 h-4 w-4 rounded accent-indigo-600 ${isReadOnly ? "cursor-default opacity-70" : "cursor-pointer"}`}
                            />
                            <div>
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge variant="outline" className={`text-[10px] font-semibold bg-slate-900 text-white hover:bg-slate-800`}>
                                  🏠 {item.room || "Other"}
                                </Badge>
                                <Badge variant="outline" className={`text-[10px] font-semibold ${item.syncToExpenses ? "bg-white text-emerald-800 border-emerald-300" : item.checked ? "bg-white text-indigo-700 border-indigo-200" : "bg-slate-50 text-slate-500"}`}>
                                  📁 {item.category}
                                </Badge>
                                {getStatusBadge(item.status)}
                                {item.syncToExpenses && (
                                  <Badge className="bg-emerald-600 text-white border-emerald-700 text-[10px] font-bold">
                                    Synced to Expenses 💰
                                  </Badge>
                                )}
                              </div>
                              <CardTitle className="text-base font-bold text-slate-900 leading-tight">
                                {item.title}
                              </CardTitle>
                            </div>
                          </div>

                          <Button 
                            size="sm" 
                            onClick={() => handleOpenEdit(item)} 
                            className={`h-8 px-4 text-white font-bold text-[11px] rounded-md shadow-sm shrink-0 ${isReadOnly ? "bg-slate-600 hover:bg-slate-500" : "bg-blue-600 hover:bg-blue-500"}`}
                          >
                            {isReadOnly ? "View" : "Edit"}
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 pt-1 space-y-3 text-xs text-slate-600">
                        <div className={`grid grid-cols-2 gap-2 p-2.5 rounded-lg border ${item.syncToExpenses ? "bg-white/90 border-emerald-200" : item.checked ? "bg-white/80 border-indigo-100" : "bg-slate-50 border-slate-100"}`}>
                          <div>
                            <span className="text-slate-400 font-medium block text-[10px] uppercase">Price</span>
                            <span className="font-bold text-slate-900">
                              {item.price ? `$${extractPrice(item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium block text-[10px] uppercase">Model / SKU</span>
                            <span className="font-semibold text-slate-800 truncate block">{item.modelNumber || "N/A"}</span>
                          </div>
                        </div>

                        {item.notes && (
                          <p className={`leading-relaxed text-slate-600 p-2 rounded text-[11px] border ${item.syncToExpenses ? "bg-white/90 border-emerald-200" : item.checked ? "bg-white/80 border-indigo-100" : "bg-amber-50/60 border-amber-100"}`}>
                            {item.notes}
                          </p>
                        )}

                        <div className="flex items-center justify-between border-t pt-2.5 border-slate-200/60">
                          {item.vendorUrl ? (
                            <a
                              href={item.vendorUrl.startsWith("http") ? item.vendorUrl : `https://${item.vendorUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 text-xs"
                            >
                              🔗 Open Vendor Link ↗
                            </a>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">No link attached</span>
                          )}

                          <span className={`text-[11px] font-bold ${item.syncToExpenses ? "text-emerald-700" : item.checked ? "text-indigo-700" : "text-slate-400"}`}>
                            {item.syncToExpenses ? "Synced & Checked ✓" : item.checked ? "Added to Total ✓" : "Unchecked"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}

                {filteredItems.length === 0 && (
                  <div className="py-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
                    <p className="text-slate-500 text-sm font-medium">No items found matching your filters.</p>
                    {!isReadOnly && (
                      <Button 
                        size="sm" 
                        onClick={() => handleOpenAdd(null, null)} 
                        className="mt-3 bg-blue-600 hover:bg-blue-400 text-white font-semibold text-xs h-9 px-4 shadow-sm"
                      >
                        + Add First Item
                      </Button>
                    )}
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>
      </Card>

      {/* 🔥 NEW MODAL: DELETE ROOM FLOW */}
      <Dialog open={isRoomDeleteModalOpen} onOpenChange={setIsRoomDeleteModalOpen}>
        <DialogContent className="sm:max-w-[440px] bg-white text-slate-900 border-2 border-slate-900 rounded-xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 bg-slate-900 border-b border-slate-800 shrink-0">
            <DialogTitle className="text-lg font-bold text-rose-500">
              Delete Room
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300 mt-1">
              You are about to delete <strong className="text-white">"{roomToDelete}"</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5 bg-white space-y-4">
            {(() => {
              const itemsInFolder = items.filter(i => (i.room || "Other") === roomToDelete).length;
              
              if (itemsInFolder === 0) {
                return (
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">
                    This room is completely empty. Are you sure you want to delete it?
                  </p>
                )
              }

              return (
                <>
                  <p className="text-sm text-slate-600 font-medium mb-3">
                    There are <strong>{itemsInFolder} item(s)</strong> assigned to this room. What would you like to do with them?
                  </p>
                  
                  <div className="grid gap-3">
                    <label className={`flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-colors ${roomDeleteMode === 'move' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-white hover:border-blue-200'}`}>
                      <div className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          name="room_delete_mode" 
                          checked={roomDeleteMode === 'move'} 
                          onChange={() => setRoomDeleteMode('move')}
                          className="h-4 w-4 accent-blue-600"
                        />
                        <span className="text-sm font-bold text-slate-900">Keep items and assign them to:</span>
                      </div>
                      
                      {roomDeleteMode === 'move' && (
                        <div className="pl-6 pt-2">
                          <select
                            value={roomMoveTarget}
                            onChange={(e) => setRoomMoveTarget(e.target.value)}
                            className="w-full h-9 rounded-md border border-slate-300 px-3 py-1 text-sm bg-white shadow-sm"
                          >
                            {rooms.filter(r => r !== "All Rooms" && r !== roomToDelete).map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </label>

                    <label className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${roomDeleteMode === 'delete' ? 'border-rose-500 bg-rose-50/50' : 'border-slate-200 bg-white hover:border-rose-200'}`}>
                      <input 
                        type="radio" 
                        name="room_delete_mode" 
                        checked={roomDeleteMode === 'delete'} 
                        onChange={() => setRoomDeleteMode('delete')}
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
              onClick={handleConfirmRoomDelete}
              className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-sm h-9" 
            >
              Confirm Delete
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsRoomDeleteModalOpen(false)} 
              className="flex-1 shadow-sm font-semibold text-slate-700 hover:bg-slate-100 h-9"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🔥 NEW MODAL: DELETE CATEGORY FLOW */}
      <Dialog open={isCategoryDeleteModalOpen} onOpenChange={setIsCategoryDeleteModalOpen}>
        <DialogContent className="sm:max-w-[440px] bg-white text-slate-900 border-2 border-slate-900 rounded-xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 bg-slate-900 border-b border-slate-800 shrink-0">
            <DialogTitle className="text-lg font-bold text-rose-500">
              Delete Category
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300 mt-1">
              You are about to delete <strong className="text-white">"{categoryToDelete}"</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5 bg-white space-y-4">
            {(() => {
              const itemsInFolder = items.filter(i => i.category === categoryToDelete).length;
              
              if (itemsInFolder === 0) {
                return (
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">
                    This category is completely empty. Are you sure you want to delete it?
                  </p>
                )
              }

              return (
                <>
                  <p className="text-sm text-slate-600 font-medium mb-3">
                    There are <strong>{itemsInFolder} item(s)</strong> assigned to this category. What would you like to do with them?
                  </p>
                  
                  <div className="grid gap-3">
                    <label className={`flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-colors ${categoryDeleteMode === 'move' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-white hover:border-blue-200'}`}>
                      <div className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          name="cat_delete_mode" 
                          checked={categoryDeleteMode === 'move'} 
                          onChange={() => setCategoryDeleteMode('move')}
                          className="h-4 w-4 accent-blue-600"
                        />
                        <span className="text-sm font-bold text-slate-900">Keep items and reassign them to:</span>
                      </div>
                      
                      {categoryDeleteMode === 'move' && (
                        <div className="pl-6 pt-2">
                          <select
                            value={categoryMoveTarget}
                            onChange={(e) => setCategoryMoveTarget(e.target.value)}
                            className="w-full h-9 rounded-md border border-slate-300 px-3 py-1 text-sm bg-white shadow-sm"
                          >
                            {categories.filter(c => c !== "All Categories" && c !== categoryToDelete).map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </label>

                    <label className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${categoryDeleteMode === 'delete' ? 'border-rose-500 bg-rose-50/50' : 'border-slate-200 bg-white hover:border-rose-200'}`}>
                      <input 
                        type="radio" 
                        name="cat_delete_mode" 
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

      {/* Budget Dialog */}
      <Dialog open={isBudgetModalOpen} onOpenChange={setIsBudgetModalOpen}>
        <DialogContent className="sm:max-w-[360px] border-2 border-slate-900 rounded-xl p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-6 py-5 bg-slate-900 border-b border-slate-800 shrink-0">
            <DialogTitle className="text-orange-400 font-bold">Set Budget Target</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 px-6 py-4 bg-white">
            <Label htmlFor="budget-input" className="text-xs font-semibold text-slate-700">Estimated Allowance / Budget ($)</Label>
            <Input
              id="budget-input"
              type="number"
              placeholder="e.g. 1000"
              disabled={isReadOnly}
              value={tempBudgetVal}
              className="h-9 text-sm shadow-sm"
              onChange={(e) => setTempBudgetVal(e.target.value)}
            />
          </div>
          <div className="flex gap-2 p-6 pt-4 border-t border-slate-100 shrink-0 bg-white">
            <Button 
              size="sm"
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm h-9" 
              onClick={handleSaveBudget}
            >
              Save Target
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsBudgetModalOpen(false)} 
              className="flex-1 shadow-sm font-semibold text-slate-700 hover:bg-slate-100 h-9"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Item Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] border-2 border-slate-900 rounded-xl [&>button]:text-slate-400 hover:[&>button]:text-white p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="px-6 py-5 bg-slate-900 border-b border-slate-800 shrink-0">
            <DialogTitle className="text-orange-400 font-bold">
              {isReadOnly ? "View Material Selection" : editingItem ? "Edit Material Selection" : "Add New Material Selection"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 grid gap-4 bg-white">
            <div>
              <Label htmlFor="item-title" className="text-xs font-semibold text-slate-700">Item Name / Title {isReadOnly ? "" : "*"}</Label>
              <Input 
                id="item-title" 
                placeholder="e.g. Kohler Pull-Down Kitchen Faucet" 
                value={formTitle} 
                disabled={isReadOnly}
                onChange={(e) => setFormTitle(e.target.value)} 
                className={`mt-1 h-9 shadow-sm text-sm ${isReadOnly ? "opacity-80 font-medium text-slate-900" : ""}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="item-room" className="text-xs font-semibold text-slate-700">Room / Location</Label>
                <select
                  id="item-room"
                  value={formRoom}
                  disabled={isReadOnly}
                  onChange={(e) => setFormRoom(e.target.value)}
                  className={`mt-1 w-full h-9 border border-slate-200 shadow-sm rounded-md px-3 text-sm bg-white appearance-none ${isReadOnly ? "opacity-80 font-medium text-slate-900" : ""}`}
                >
                  {rooms.filter((r) => r !== "All Rooms").map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="item-cat" className="text-xs font-semibold text-slate-700">Material Category</Label>
                <select
                  id="item-cat"
                  value={formCategory}
                  disabled={isReadOnly}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className={`mt-1 w-full h-9 border border-slate-200 shadow-sm rounded-md px-3 text-sm bg-white appearance-none ${isReadOnly ? "opacity-80 font-medium text-slate-900" : ""}`}
                >
                  {categories.filter((c) => c !== "All Categories").map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="item-status" className="text-xs font-semibold text-slate-700">Status</Label>
              <select
                id="item-status"
                value={formStatus}
                disabled={isReadOnly}
                onChange={(e) => setFormStatus(e.target.value as SelectionItem["status"])}
                className={`mt-1 w-full h-9 border border-slate-200 shadow-sm rounded-md px-3 text-sm bg-white appearance-none ${isReadOnly ? "opacity-80 font-medium text-slate-900" : ""}`}
              >
                <option value="Idea / Saved">Idea / Saved</option>
                <option value="Selected">Selected</option>
                <option value="Under Review">Under Review</option>
                <option value="Ordered">Ordered</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>

            <div>
              <Label htmlFor="item-url" className="text-xs font-semibold text-slate-700">Product Link / URL</Label>
              <Input 
                id="item-url" 
                placeholder="https://www.homedepot.com/p/..." 
                value={formUrl} 
                disabled={isReadOnly}
                onChange={(e) => setFormUrl(e.target.value)} 
                className={`mt-1 h-9 shadow-sm text-sm ${isReadOnly ? "opacity-80 font-medium text-slate-900" : ""}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="item-price" className="text-xs font-semibold text-slate-700">Est. Price</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-medium">$</span>
                  <Input 
                    id="item-price" 
                    placeholder="e.g. 249.00" 
                    value={formPrice} 
                    disabled={isReadOnly}
                    onChange={(e) => setFormPrice(e.target.value)} 
                    className={`pl-6 h-9 shadow-sm text-sm ${isReadOnly ? "opacity-80 font-medium text-slate-900" : ""}`}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="item-model" className="text-xs font-semibold text-slate-700">Model / SKU #</Label>
                <Input 
                  id="item-model" 
                  placeholder="e.g. K-596-VS" 
                  value={formModel} 
                  disabled={isReadOnly}
                  onChange={(e) => setFormModel(e.target.value)} 
                  className={`mt-1 h-9 shadow-sm text-sm ${isReadOnly ? "opacity-80 font-medium text-slate-900" : ""}`}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="item-notes" className="text-xs font-semibold text-slate-700">Notes / Requirements</Label>
              <Input 
                id="item-notes" 
                placeholder="e.g. Needs 3/8 valve connection, matte black finish" 
                value={formNotes} 
                disabled={isReadOnly}
                onChange={(e) => setFormNotes(e.target.value)} 
                className={`mt-1 h-9 shadow-sm text-sm ${isReadOnly ? "opacity-80 font-medium text-slate-900" : ""}`}
              />
            </div>

            <div className="flex items-center justify-between p-3 mt-1 bg-emerald-50/80 border border-emerald-200 rounded-lg">
              <div>
                <Label htmlFor="sync-expenses-toggle" className={`font-semibold text-emerald-950 text-xs block ${isReadOnly ? "cursor-default" : "cursor-pointer"}`}>
                  💰 Sync to Expenses Tab
                </Label>
                <p className="text-[11px] text-emerald-800 mt-1">
                  Automatically logs material price under Project Expenses & updates Dashboard totals.
                </p>
              </div>
              <input
                id="sync-expenses-toggle"
                type="checkbox"
                checked={formSyncToExpenses}
                disabled={isReadOnly}
                onChange={(e) => setFormSyncToExpenses(e.target.checked)}
                className={`h-5 w-5 accent-emerald-600 rounded shrink-0 ${isReadOnly ? "cursor-default opacity-70" : "cursor-pointer"}`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 p-6 pt-4 border-t border-slate-100 shrink-0 bg-white items-center">
            {isReadOnly ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsModalOpen(false)} 
                className="w-full shadow-sm font-semibold text-slate-700 hover:bg-slate-100"
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
                    {isSubmitting ? "Saving..." : editingItem ? "Save Changes" : "Add Selection"}
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

    </main>
  )
}