"use client"

import { useState, useMemo, useEffect } from "react"
import { useOfflineSync } from "@/hooks/useOfflineSync"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { PaywallOverlay } from "@/components/paywall-overlay"
import { PageTour } from "@/components/page-tour"

export interface PunchItem {
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

interface CalendarTask {
  id: number
  title: string
  startDate: string
  endDate: string
}

const DEFAULT_CATEGORIES = [
  "All Categories",
  "General To-Do",
  "Framing & Drywall",
  "Plumbing & HVAC",
  "Electrical",
  "Finishes & Paint",
  "Exterior & Landscaping",
]

const INITIAL_PUNCH_LIST: PunchItem[] = [
  { id: 1, text: "👋 Welcome to CleanBuild! Check this box to complete a task.", category: "General To-Do", completed: false },
  { id: 2, text: "Click 'Edit' to assign an email. (We'll email them a reminder!)", category: "General To-Do", completed: false },
  { id: 3, text: "Delete this task using the 'Edit' menu.", category: "General To-Do", completed: false },
]

// 🔥 Define the Tour Steps for Punch List
const PUNCH_LIST_TOUR_STEPS = [
  {
    target: ".tour-punch-header",
    content: "Welcome to the Punch List! Track all your remaining tasks, inspections, and final fixes here.",
  },
  {
    target: ".tour-punch-progress",
    content: "Keep an eye on your overall completion. This bar fills up automatically as you check off tasks.",
  },
  {
    target: ".tour-punch-folders",
    content: "Organize tasks by category or trade. Use the '+' to quickly add tasks directly to a specific folder.",
  },
  {
    target: ".tour-punch-add",
    content: "Click here to create a new task. You can link them directly to schedule dates or assign emails for automated reminders!",
  }
]

const getLocalTodayStr = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return ""
  const cleanDate = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr
  const [year, month, day] = cleanDate.split("-")
  if (!year || !month || !day) return dateStr
  return `${parseInt(month, 10)}/${parseInt(day, 10)}/${year.slice(-2)}`
}

export default function PunchListPage() {
  const [isMounted, setIsMounted] = useState(false)
  const [items, setItems] = useOfflineSync<PunchItem[]>("cleanbuild_punch_list", INITIAL_PUNCH_LIST)
  const [calendarTasks] = useOfflineSync<CalendarTask[]>("cleanbuild_calendar_tasks", [])
  
  const [categories, setCategories] = useOfflineSync<string[]>("cleanbuild_punch_categories", DEFAULT_CATEGORIES)
  
  const [selectedCategory, setSelectedCategory] = useState<string>("All Categories")
  const [searchQuery, setSearchQuery] = useState<string>("")

  // 🔥 State for Minimalist Dropdown Menu
  const [isOptionsOpen, setIsOptionsOpen] = useState(false)

  // Adding Custom Category State
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")

  // Deleting Category State
  const [isCategoryDeleteModalOpen, setIsCategoryDeleteModalOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)
  const [categoryDeleteMode, setCategoryDeleteMode] = useState<"move" | "delete">("move")
  const [categoryMoveTarget, setCategoryMoveTarget] = useState<string>("General To-Do")

  // Auth, Permissions & Billing State
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("")
  const [isGuest, setIsGuest] = useState(false)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [accountTier, setAccountTier] = useState<string>("free")
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Self-Healing Logic for "All Categories"
  useEffect(() => {
    if (isMounted && categories) {
      let needsUpdate = false
      let newCats = [...categories]

      if (!newCats.includes("All Categories")) {
        newCats.unshift("All Categories")
        needsUpdate = true
      }

      if (newCats.indexOf("All Categories") !== 0) {
        newCats = newCats.filter(c => c !== "All Categories")
        newCats.unshift("All Categories")
        needsUpdate = true
      }

      if (needsUpdate) {
        setCategories(newCats)
        if (selectedCategory === "All Categories") {
          setSelectedCategory("All Categories")
        }
      }
    }
  }, [isMounted, categories, selectedCategory, setCategories])

  useEffect(() => {
    const fetchUserAndPermissions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email) {
          setCurrentUserEmail(user.email)
          
          const { data: profile } = await supabase.from("profiles").select("tier").eq("id", user.id).maybeSingle()
          if (profile) setAccountTier(profile.tier)
          
          const activeWorkspaceId = localStorage.getItem("cleanbuild_active_workspace") || user.id

          if (activeWorkspaceId === user.id) {
            setIsGuest(false)
          } else {
            setIsGuest(true)
            const { data: guestInvite } = await supabase
              .from("project_members")
              .select("permissions")
              .eq("invite_email", user.email)
              .ilike("status", "active")
              .maybeSingle()

            if (guestInvite?.permissions) {
              if (guestInvite.permissions.punch_list === "read-only") {
                setIsReadOnly(true)
              }
            }
          }
        }
      } finally {
        setIsCheckingAuth(false)
      }
    }
    fetchUserAndPermissions()
  }, [])

  const showPaywall = !isCheckingAuth && !isGuest && accountTier === "free"

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [editingItem, setEditingItem] = useState<PunchItem | null>(null)

  const [formText, setFormText] = useState("")
  const [formCategory, setFormCategory] = useState("General To-Do")
  const [formNotes, setFormNotes] = useState("")
  const [formDueDate, setFormDueDate] = useState("")
  
  const [isLinked, setIsLinked] = useState<boolean>(false)
  const [linkedTaskId, setLinkedTaskId] = useState<number | "">("")
  const [linkedTaskOffset, setLinkedTaskOffset] = useState<number>(0)
  
  const [formEmails, setFormEmails] = useState<string[]>([])
  const [emailInput, setEmailInput] = useState("")

  const completedCount = useMemo(() => items.filter((i) => i.completed).length, [items])
  const totalCount = items.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const getAlertStatus = (dueDate?: string, completed?: boolean) => {
    if (!dueDate || completed) return null
    const today = getLocalTodayStr()
    if (dueDate === today) return "today"
    if (dueDate < today) return "overdue"
    return "upcoming"
  }

  const filteredItems = useMemo(() => {
    const filtered = items.filter((item) => {
      const matchesCategory = selectedCategory === "All Categories" || item.category === selectedCategory
      const matchesSearch =
        item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchesCategory && matchesSearch
    })

    return filtered.sort((a, b) => {
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
  }, [items, selectedCategory, searchQuery, calendarTasks])

  // --- Category Actions ---
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

  const handleOpenDeleteCategory = (cat: string) => {
    setCategoryToDelete(cat)
    const availableFallbacks = categories.filter(c => c !== "All Categories" && c !== cat)
    setCategoryMoveTarget(availableFallbacks.includes("General To-Do") ? "General To-Do" : availableFallbacks[0] || "")
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

  const handleToggleComplete = (id: number) => {
    if (isReadOnly) return
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, completed: !i.completed } : i)))
  }

  const handleAddEmail = () => {
    if (isReadOnly || !emailInput.trim()) return
    const trimmed = emailInput.trim().toLowerCase()
    
    if (!formEmails.includes(trimmed)) {
      setFormEmails([...formEmails, trimmed])
    }
    setEmailInput("")
  }

  const handleRemoveEmail = (emailToRemove: string) => {
    if (isReadOnly) return
    setFormEmails(formEmails.filter(e => e !== emailToRemove))
  }

  const handleOpenAdd = (prefillCategory?: string | null) => {
    if (isReadOnly) return
    setEditingItem(null)
    setFormText("")
    setFormCategory(prefillCategory || (selectedCategory !== "All Categories" ? selectedCategory : "General To-Do"))
    setFormNotes("")
    setFormDueDate("")
    setIsLinked(false)
    setLinkedTaskId("")
    setLinkedTaskOffset(0)
    setFormEmails(currentUserEmail ? [currentUserEmail.toLowerCase()] : [])
    setEmailInput("")
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: PunchItem) => {
    setEditingItem(item)
    setFormText(item.text)
    setFormCategory(item.category || "General To-Do")
    setFormNotes(item.notes || "")
    setFormDueDate(item.dueDate || "")
    setIsLinked(!!item.linkedTaskId)
    setLinkedTaskId(item.linkedTaskId || "")
    setLinkedTaskOffset(item.linkedTaskOffset || 0)
    
    let emails = item.assignedEmails || []
    if ((item as any).assignedEmail && emails.length === 0) {
      emails = [(item as any).assignedEmail]
    }
    
    setFormEmails(emails)
    setEmailInput("")
    setIsModalOpen(true)
  }

  const handleSaveItem = () => {
    if (isReadOnly || !formText.trim()) return

    const finalLinkedTaskId = isLinked && linkedTaskId !== "" ? Number(linkedTaskId) : undefined
    const finalLinkedTaskOffset = isLinked ? linkedTaskOffset : undefined

    if (editingItem) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === editingItem.id
            ? { 
                ...i, 
                text: formText.trim(), 
                category: formCategory, 
                notes: formNotes.trim(),
                dueDate: isLinked ? "" : formDueDate,
                assignedEmails: formEmails,
                linkedTaskId: finalLinkedTaskId,
                linkedTaskOffset: finalLinkedTaskOffset
              }
            : i
        )
      )
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: formText.trim(),
          category: formCategory,
          notes: formNotes.trim(),
          completed: false,
          dueDate: isLinked ? "" : formDueDate,
          assignedEmails: formEmails,
          linkedTaskId: finalLinkedTaskId,
          linkedTaskOffset: finalLinkedTaskOffset
        },
      ])
    }
    setIsModalOpen(false)
  }

  const handleDeleteItem = () => {
    if (isReadOnly || !editingItem) return
    setItems((prev) => prev.filter((i) => i.id !== editingItem.id))
    setIsModalOpen(false)
  }

  // 🔥 CSV Export Engine
  const handleExportCSV = () => {
    const headers = ["Task / Description", "Category", "Status", "Due Date", "Assigned Emails", "Notes"]
    
    const rows = items.map((item) => {
      let displayDueDate = item.dueDate || ""
      if (item.linkedTaskId) {
        const linkedTask = calendarTasks.find(t => t.id === item.linkedTaskId)
        if (linkedTask) {
          const baseDate = new Date(linkedTask.endDate + "T00:00:00")
          if (item.linkedTaskOffset) baseDate.setDate(baseDate.getDate() + item.linkedTaskOffset)
          displayDueDate = baseDate.toISOString().split("T")[0]
        }
      }

      return [
        `"${item.text.replace(/"/g, '""')}"`,
        `"${item.category.replace(/"/g, '""')}"`,
        `"${item.completed ? 'Completed' : 'Pending'}"`,
        `"${displayDueDate}"`,
        `"${(item.assignedEmails || []).join("; ").replace(/"/g, '""')}"`,
        `"${(item.notes || "").replace(/"/g, '""')}"`
      ]
    })

    const brandingRow = `"CleanBuild - Punch List & To-Do's"\n\n`
    const csvContent = "data:text/csv;charset=utf-8," + brandingRow + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `CleanBuild_PunchList_${getLocalTodayStr()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!isMounted) return null

  return (
    <main className={`p-6 bg-slate-100 flex flex-col text-slate-950 relative ${showPaywall ? 'h-screen overflow-hidden' : 'min-h-screen space-y-6'}`}>
      
      <PaywallOverlay show={showPaywall} />
      <PageTour steps={PUNCH_LIST_TOUR_STEPS} tourKey="punch_list_tour" />

      {/* Target: tour-punch-header with Minimalist Dropdown */}
<div className="tour-punch-header bg-slate-900 text-white p-6 md:px-8 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 md:min-h-[140px] shrink-0">        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              ✅ Punch List & To-Do's {isReadOnly && <span className="text-sm bg-slate-700 px-2 py-1 rounded-md text-slate-300 font-semibold ml-2">Read-Only</span>}
            </h1>
          </div>
          <p className="text-sm font-medium text-orange-400 mt-1.5 leading-relaxed max-w-2xl">
            {isReadOnly ? "View the project tasks and completion status." : "Track missing items, inspections, returns, and set automated reminders."}
          </p>
        </div>

        {/* Minimalist Action Layout */}
        <div className="flex items-center justify-end w-full md:w-auto gap-2 shrink-0 mt-2 md:mt-0">
          
          {!isReadOnly && (
            <Button
              size="sm"
              onClick={() => handleOpenAdd(null)}
              className="tour-punch-add bg-blue-600 hover:bg-blue-500 text-white h-9 text-xs font-semibold px-4 shadow-sm"
            >
              + Add To-Do
            </Button>
          )}

          {/* Clean, Icon-Only Dropdown Trigger */}
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

            {/* The Dropdown Menu Box */}
            {isOptionsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsOptionsOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                  
                  {items.length > 0 && (
                    <button
                      onClick={() => {
                        setIsOptionsOpen(false)
                        handleExportCSV()
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-blue-600 hover:text-white flex items-center gap-2 transition-colors"
                    >
                      <span>📊</span> Export to CSV
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      setIsOptionsOpen(false)
                      window.dispatchEvent(new Event('restart-tour-punch_list_tour'))
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-blue-600 hover:text-white flex items-center gap-2 transition-colors"
                  >
                    <span>💡</span> Replay Tutorial
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 🔥 NEW: Dedicated Progress Bar Bar */}
      <Card className="tour-punch-progress bg-white border border-slate-200 shadow-sm shrink-0 overflow-hidden">
        <div className="p-4 md:px-8 flex flex-col md:flex-row items-center gap-5">
          <div className="shrink-0 flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-extrabold text-base shadow-sm ring-1 ring-emerald-200">
              {progressPercent}%
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Project Completion</h3>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">{completedCount} of {totalCount} Tasks Completed</p>
            </div>
          </div>
          <div className="flex-1 w-full bg-slate-100 rounded-full h-3.5 overflow-hidden shadow-inner border border-slate-200/60">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden border shadow-sm bg-white flex-1">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            <div className="tour-punch-folders md:col-span-1 space-y-2">
              <div className="bg-white p-3 rounded-xl border shadow-xs space-y-1">
                
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider px-2 block mb-2">
                  Filter by Category
                </span>
                
                {categories.map((cat) => {
                  const catCount = cat === "All Categories" ? items.length : items.filter((i) => i.category === cat).length
                  const isActive = selectedCategory === cat
                  const isProtectedFolder = cat === "All Categories" || cat === "General To-Do"

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
                        <span className="truncate">{cat}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          isActive ? "bg-slate-700 text-slate-200" : "bg-slate-200 text-slate-500"
                        }`}>
                          {catCount}
                        </span>
                      </button>
                      
                      {/* 🔥 FOLDER ACTIONS GROUP */}
                      {!isReadOnly && cat !== "All Categories" && (
                        <div className="flex items-center gap-0.5 pr-1.5 shrink-0">
                          {/* Quick Add Plus (FIRST, ALWAYS VISIBLE, ORANGE) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAdd(cat); 
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

                          {/* Trash Can (SECOND, ONLY ON HOVER, RED) OR INVISIBLE PLACEHOLDER */}
                          {isProtectedFolder ? (
                            <div className="h-6 w-6 shrink-0" /> 
                          ) : (
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

                {/* Add Custom Category UI */}
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
              <div className="bg-white p-3 rounded-xl border shadow-xs">
                <Input
                  placeholder="Search tasks, notes, or categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 text-xs bg-slate-50"
                />
              </div>

              <div className="space-y-3">
                {filteredItems.map((item) => {
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

                  let cardStyle = "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                  if (item.completed) {
                    cardStyle = "bg-slate-50 border-slate-200 opacity-60 shadow-none"
                  } else if (displayDueDate) {
                    const todayMs = new Date(getLocalTodayStr() + "T00:00:00").getTime()
                    const dueMs = new Date(displayDueDate + "T00:00:00").getTime()
                    const diffDays = Math.round((dueMs - todayMs) / (1000 * 60 * 60 * 24))

                    if (diffDays < 0) {
                      cardStyle = "bg-rose-50 border-rose-200 hover:border-rose-300 shadow-xs"
                    } else if (diffDays <= 3) {
                      cardStyle = "bg-amber-50 border-amber-200 hover:border-amber-300 shadow-xs"
                    } else {
                      cardStyle = "bg-emerald-50 border-emerald-200 hover:border-emerald-300 shadow-xs"
                    }
                  }

                  return (
                    <Card key={item.id} className={`transition-all ${cardStyle}`}>
                      <CardContent className="p-4 flex items-start gap-4">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          disabled={isReadOnly}
                          onChange={() => handleToggleComplete(item.id)}
                          className={`mt-1 h-5 w-5 rounded accent-emerald-600 shrink-0 ${isReadOnly ? "cursor-default opacity-70" : "cursor-pointer"}`}
                        />
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <Badge variant="outline" className={`text-[10px] font-semibold ${item.completed ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                                  {item.category}
                                </Badge>

                                {displayDueDate && (
                                  <Badge variant="outline" className={`text-[10px] bg-white/60 ${
                                    item.linkedTaskId 
                                      ? "text-indigo-700 border-indigo-200" 
                                      : "text-slate-600 border-slate-200"
                                  }`}>
                                    {item.linkedTaskId ? `🔗 Linked: ${linkedTask?.title || "Task"} (Due: ` : "📅 Due: "}
                                    {formatDisplayDate(displayDueDate)}
                                    {item.linkedTaskOffset ? ` [${item.linkedTaskOffset > 0 ? '+' : ''}${item.linkedTaskOffset}d]` : ""}
                                    {item.linkedTaskId ? ")" : ""}
                                  </Badge>
                                )}

                                {emailsToDisplay.map((email) => (
                                  <Badge key={email} variant="outline" className="text-[10px] bg-white/60 text-slate-600 border-slate-200">
                                    ✉️ {email}
                                  </Badge>
                                ))}
                                
                                {item.completed && (
                                  <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                    Completed ✓
                                  </Badge>
                                )}
                              </div>
                              <h3 className={`text-sm font-bold leading-tight ${item.completed ? "text-slate-500 line-through" : "text-slate-900"}`}>
                                {item.text}
                              </h3>
                            </div>

                            <Button 
                              size="sm" 
                              onClick={() => handleOpenEdit(item)} 
                              className={`h-8 px-4 text-white font-bold text-[11px] rounded-md shadow-sm shrink-0 ${isReadOnly ? "bg-slate-600 hover:bg-slate-500" : "bg-blue-600 hover:bg-blue-500"}`}
                            >
                              {isReadOnly ? "View" : "Edit"}
                            </Button>
                          </div>
                          
                          {item.notes && (
                            <p className={`text-xs leading-relaxed p-2 rounded border ${item.completed ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-white/60 text-slate-600 border-slate-200"}`}>
                              {item.notes}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}

                {filteredItems.length === 0 && (
                  <div className="py-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
                    <p className="text-slate-500 text-sm font-medium">No tasks found in {selectedCategory}.</p>
                    {!isReadOnly && (
                      <Button 
                        size="sm" 
                        onClick={() => handleOpenAdd(null)} 
                        className="mt-3 bg-blue-600 hover:bg-blue-400 text-white font-semibold text-xs h-9 px-4 shadow-sm"
                      >
                        + Add New Task
                      </Button>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </Card>

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

      {/* Main Task Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90dvh] p-0 gap-0 flex flex-col overflow-hidden border-2 border-slate-900 rounded-xl [&>button]:text-slate-400 hover:[&>button]:text-white [&>button]:top-5 [&>button]:right-5">
          
          <DialogHeader className="px-6 py-5 bg-slate-900 border-b border-slate-800 shrink-0">
            <DialogTitle className="text-lg font-bold text-orange-400">
              {isReadOnly ? "View Task Details" : (editingItem ? "Edit Task" : "Add New Task")}
            </DialogTitle>
            {!isReadOnly && (
              <DialogDescription className="text-xs text-slate-300 mt-1">
                Set due dates for alerts or assign emails to trigger automated notifications.
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 grid gap-4 bg-white">
            <div>
              <Label htmlFor="task-text" className="text-xs font-semibold text-slate-700">Task Title / Description {isReadOnly ? "" : "*"}</Label>
              <Input 
                id="task-text" 
                placeholder="e.g. Caulk baseboards in master bath" 
                value={formText} 
                disabled={isReadOnly}
                onChange={(e) => setFormText(e.target.value)} 
                className={`mt-1 shadow-sm h-10 text-sm ${isReadOnly ? "opacity-80 font-medium text-slate-900" : ""}`}
              />
            </div>

            <div>
              <Label htmlFor="task-cat" className="text-xs font-semibold text-slate-700">Category</Label>
              <select
                id="task-cat"
                value={formCategory}
                disabled={isReadOnly}
                onChange={(e) => setFormCategory(e.target.value)}
                className={`flex w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none ${isReadOnly ? "opacity-80 font-medium text-slate-900" : ""}`}
              >
                {categories.filter((c) => c !== "All Categories").map((c) => (
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
                  <label className={`flex items-center gap-1.5 ${isReadOnly ? "cursor-default opacity-70" : "cursor-pointer"}`}>
                    <input 
                      type="checkbox" 
                      checked={isLinked}
                      disabled={isReadOnly}
                      onChange={(e) => setIsLinked(e.target.checked)}
                      className={`h-4 w-4 accent-blue-600 rounded ${isReadOnly ? "cursor-default" : "cursor-pointer"}`}
                    />
                    <span className="text-xs font-bold text-blue-600">Link to Schedule</span>
                  </label>
                </div>
                
                <div className="w-full">
                  {isLinked ? (
                    <select
                      value={linkedTaskId}
                      disabled={isReadOnly}
                      onChange={(e) => setLinkedTaskId(e.target.value === "" ? "" : Number(e.target.value))}
                      className={`flex w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none ${linkedTaskId === "" ? "text-slate-500" : "text-slate-900"} ${isReadOnly ? "opacity-80" : ""}`}
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
                    <Input 
                      id="task-date" 
                      type="date"
                      value={formDueDate} 
                      disabled={isReadOnly}
                      onChange={(e) => setFormDueDate(e.target.value)} 
                      className={`flex w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 ${isReadOnly ? "opacity-80" : ""}`}
                    />
                  )}
                </div>

              </div>
                
              {isLinked && linkedTaskId !== "" && (
                <div className="flex items-center justify-center gap-2 bg-slate-50 p-2 rounded-md border border-slate-200 mt-3">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Offset (Days)</Label>
                  <Input 
                    type="number" 
                    value={linkedTaskOffset} 
                    disabled={isReadOnly}
                    onChange={(e) => setLinkedTaskOffset(e.target.value === "" ? 0 : parseInt(e.target.value, 10))}
                    className={`h-7 w-16 text-xs text-center px-1 shadow-sm bg-white ${isReadOnly ? "opacity-80" : ""}`}
                  />
                  <span className="text-[10px] text-slate-400 font-medium">
                    (- for lead before, + for lag after)
                  </span>
                </div>
              )}
            </div>
              
            <div className="pt-3 border-t border-slate-100">
              <Label className="text-xs font-semibold text-slate-700 block mb-1.5">Email Assignments</Label>
              {!isReadOnly && (
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
                  <Button type="button" onClick={handleAddEmail} className="bg-blue-600 hover:bg-blue-400 text-white font-semibold px-4 h-10 shadow-sm">
                    Add
                  </Button>
                </div>
              )}
              
              {formEmails.length > 0 ? (
                <div className={`flex flex-wrap gap-2 ${!isReadOnly ? "mt-3" : ""}`}>
                  {formEmails.map((email, idx) => (
                    <span key={idx} className={`bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium ${isReadOnly ? "opacity-90" : ""}`}>
                      {email}
                      {!isReadOnly && (
                        <button 
                          type="button" 
                          onClick={() => handleRemoveEmail(email)} 
                          className="hover:text-rose-600 transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                isReadOnly && <p className="text-sm text-slate-500 italic">No emails assigned.</p>
              )}
            </div>

            <div>
              <Label htmlFor="task-notes" className="text-xs font-bold text-slate-700">Additional Notes (Optional)</Label>
              <textarea 
                id="task-notes" 
                rows={3}
                placeholder="Details, measurements, or materials needed..." 
                value={formNotes} 
                disabled={isReadOnly}
                onChange={(e) => setFormNotes(e.target.value)} 
                className={`w-full mt-1 p-2.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm ${isReadOnly ? "opacity-80 font-medium text-slate-900" : ""}`}
              />
            </div>
  
            <div className="flex flex-col gap-2 pt-4 mt-2 pb-2 border-t border-slate-100 shrink-0">
            
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
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm" 
                    onClick={handleSaveItem} 
                  >
                    {editingItem ? "Save Changes" : "Add Task"}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsModalOpen(false)} 
                    className="flex-1 shadow-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </Button>
                </div>

                {/* 🔥 Red Delete Button moved safely to the bottom of the modal */}
                {editingItem && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleDeleteItem} 
                    className="w-full shadow-sm bg-rose-600 hover:bg-rose-500 text-white font-bold"
                  >
                    Delete
                  </Button>
                )}
              </>
            )}

            </div>
          </div>
        </DialogContent>
      </Dialog>

    </main>
  )
}