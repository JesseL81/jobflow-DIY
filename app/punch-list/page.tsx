"use client"

import { useState, useMemo, useEffect } from "react"
import { useOfflineSync } from "@/hooks/useOfflineSync"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"

export interface PunchItem {
  id: number
  text: string
  category: string
  notes?: string
  completed: boolean
  dueDate?: string 
  assignedEmails?: string[]
  linkedTaskId?: number
  linkedTaskOffset?: number // Stores the lead/lag days offset
}

interface CalendarTask {
  id: number
  title: string
  startDate: string
  endDate: string
}

const CATEGORIES = [
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
  // 1. Universal Sync Hooks
  const [items, setItems] = useOfflineSync<PunchItem[]>("cleanbuild_punch_list", INITIAL_PUNCH_LIST)
  const [calendarTasks] = useOfflineSync<CalendarTask[]>("cleanbuild_calendar_tasks", [])
  
  const [selectedCategory, setSelectedCategory] = useState<string>("All Categories")
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Fetch logged-in user's email for auto-filling
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("")

  useEffect(() => {
    const fetchUserEmail = async () => {
      const { data } = await supabase.auth.getUser()
      if (data?.user?.email) {
        setCurrentUserEmail(data.user.email)
      }
    }
    fetchUserEmail()
  }, [])

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [editingItem, setEditingItem] = useState<PunchItem | null>(null)

  // Form State
  const [formText, setFormText] = useState("")
  const [formCategory, setFormCategory] = useState("General To-Do")
  const [formNotes, setFormNotes] = useState("")
  const [formDueDate, setFormDueDate] = useState("")
  
  // Link to Schedule State
  const [isLinked, setIsLinked] = useState<boolean>(false)
  const [linkedTaskId, setLinkedTaskId] = useState<number | "">("")
  const [linkedTaskOffset, setLinkedTaskOffset] = useState<number>(0)
  
  // Multi-Email State
  const [formEmails, setFormEmails] = useState<string[]>([])
  const [emailInput, setEmailInput] = useState("")

  // --- CALCULATIONS ---
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

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = selectedCategory === "All Categories" || item.category === selectedCategory
      const matchesSearch =
        item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchesCategory && matchesSearch
    })
  }, [items, selectedCategory, searchQuery])

  // Toggle Checkbox
  const handleToggleComplete = (id: number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, completed: !i.completed } : i)))
  }

  // Email Handlers
  const handleAddEmail = () => {
    if (!emailInput.trim()) return
    const trimmed = emailInput.trim().toLowerCase()
    
    if (!formEmails.includes(trimmed)) {
      setFormEmails([...formEmails, trimmed])
    }
    setEmailInput("")
  }

  const handleRemoveEmail = (emailToRemove: string) => {
    setFormEmails(formEmails.filter(e => e !== emailToRemove))
  }

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingItem(null)
    setFormText("")
    setFormCategory(selectedCategory !== "All Categories" ? selectedCategory : "General To-Do")
    setFormNotes("")
    setFormDueDate("")
    setIsLinked(false)
    setLinkedTaskId("")
    setLinkedTaskOffset(0)
    // Auto-populate the active user's email if we have it
    setFormEmails(currentUserEmail ? [currentUserEmail.toLowerCase()] : [])
    setEmailInput("")
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (item: PunchItem) => {
    setEditingItem(item)
    setFormText(item.text)
    setFormCategory(item.category || "General To-Do")
    setFormNotes(item.notes || "")
    setFormDueDate(item.dueDate || "")
    setIsLinked(!!item.linkedTaskId)
    setLinkedTaskId(item.linkedTaskId || "")
    setLinkedTaskOffset(item.linkedTaskOffset || 0)
    
    // Silently migrate legacy single-email string if it exists
    let emails = item.assignedEmails || []
    if ((item as any).assignedEmail && emails.length === 0) {
      emails = [(item as any).assignedEmail]
    }
    
    setFormEmails(emails)
    setEmailInput("")
    setIsModalOpen(true)
  }

  // Save Item
  const handleSaveItem = () => {
    if (!formText.trim()) return

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
                dueDate: isLinked ? "" : formDueDate, // Clear manual date if linked to calendar
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

  // Delete Item
  const handleDeleteItem = () => {
    if (!editingItem) return
    setItems((prev) => prev.filter((i) => i.id !== editingItem.id))
    setIsModalOpen(false)
  }

  return (
    <main className="p-6 bg-slate-100 min-h-screen space-y-6 flex flex-col text-slate-950">
      
      {/* LOCKED HEIGHT HEADER BUBBLE */}
      <div className="bg-slate-900 text-white p-6 md:px-8 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:h-[140px] shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">✅ Punch List & To-Do's</h1>
          </div>
          <p className="text-sm font-medium text-orange-400 mt-1.5 leading-relaxed max-w-2xl">
            Track missing items, inspections, returns, and set automated reminders.
          </p>
        </div>

        <div className="flex items-center justify-center w-full md:w-auto gap-3 shrink-0">
          <div className="bg-slate-800/80 border border-slate-700 py-1.5 px-3 rounded-lg text-right">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Completion</span>
            <span className="text-base font-extrabold text-emerald-400">
              {progressPercent}% <span className="text-xs text-slate-300 font-medium ml-1">({completedCount}/{totalCount})</span>
            </span>
          </div>

          <Button
            size="sm"
            onClick={handleOpenAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white h-10 text-xs font-semibold px-4 shadow-sm"
          >
            + Add To-Do
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border shadow-sm bg-white flex-1">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* Left Category Sidebar */}
            <div className="md:col-span-1 space-y-2">
              <div className="bg-white p-3 rounded-xl border shadow-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-2">
                  Task Categories
                </span>
                {CATEGORIES.map((cat) => {
                  const catCount = cat === "All Categories" ? items.length : items.filter((i) => i.category === cat).length
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
              </div>
            </div>

            {/* Right Content Area */}
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
                  const cardStyle = item.completed 
                    ? "bg-slate-50 border-slate-200 opacity-75" 
                    : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"

                  const legacyEmail = (item as any).assignedEmail
                  const emailsToDisplay = item.assignedEmails && item.assignedEmails.length > 0 
                    ? item.assignedEmails 
                    : (legacyEmail ? [legacyEmail] : [])

                  // Resolve Dynamic Due Date from Calendar Task if linked (with offsets)
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

                  return (
                    <Card key={item.id} className={`transition-all ${cardStyle}`}>
                      <CardContent className="p-4 flex items-start gap-4">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => handleToggleComplete(item.id)}
                          className="mt-1 h-5 w-5 rounded accent-emerald-600 cursor-pointer shrink-0"
                        />
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <Badge variant="outline" className={`text-[10px] font-semibold ${item.completed ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                                  {item.category}
                                </Badge>

                                {/* Dynamic Due Date Badge */}
                                {displayDueDate && (
                                  <Badge variant="outline" className={`text-[10px] ${
                                    item.linkedTaskId 
                                      ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                                      : "bg-slate-50 text-slate-600 border-slate-200"
                                  }`}>
                                    {item.linkedTaskId ? `🔗 Linked: ${linkedTask?.title || "Task"} (Due: ` : "📅 Due: "}
                                    {formatDisplayDate(displayDueDate)}
                                    {item.linkedTaskOffset ? ` [${item.linkedTaskOffset > 0 ? '+' : ''}${item.linkedTaskOffset}d]` : ""}
                                    {item.linkedTaskId ? ")" : ""}
                                  </Badge>
                                )}

                                {emailsToDisplay.map((email) => (
                                  <Badge key={email} variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">
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

                            <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(item)} className="h-7 text-xs text-slate-500 hover:bg-slate-200 shrink-0">
                              Edit
                            </Button>
                          </div>
                          
                          {item.notes && (
                            <p className={`text-xs leading-relaxed p-2 rounded border ${item.completed ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-amber-50/60 text-slate-600 border-amber-100"}`}>
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
                    <Button variant="outline" size="sm" onClick={handleOpenAdd} className="mt-3 text-xs">
                      + Add New Task
                    </Button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </Card>

      {/* Add / Edit Task Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Task" : "Add New Task"}</DialogTitle>
            <DialogDescription className="text-xs">
              Set due dates for alerts or assign emails to trigger automated notifications.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div>
              <Label htmlFor="task-text" className="text-xs font-semibold text-slate-700">Task Title / Description *</Label>
              <Input 
                id="task-text" 
                placeholder="e.g. Caulk baseboards in master bath" 
                value={formText} 
                onChange={(e) => setFormText(e.target.value)} 
                className="mt-1 shadow-sm h-10 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="task-cat" className="text-xs font-semibold text-slate-700">Category</Label>
              <select
                id="task-cat"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full mt-1 h-10 border rounded-md px-3 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.filter((c) => c !== "All Categories").map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              {/* Due Date with Toggle & Offset */}
              <div className="bg-white">
                <Label className="text-xs font-semibold text-slate-700 block mb-2 text-center whitespace-nowrap">
                  Due Date (For Alerts)
                </Label>
                
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    {isLinked ? (
                      <select
                        value={linkedTaskId}
                        onChange={(e) => setLinkedTaskId(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full h-10 border rounded-md px-3 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select calendar task...</option>
                        {calendarTasks.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.title} ({formatDisplayDate(t.endDate)})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input 
                        id="task-date" 
                        type="date"
                        value={formDueDate} 
                        onChange={(e) => setFormDueDate(e.target.value)} 
                        className="shadow-sm h-10 text-sm w-full"
                      />
                    )}
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      checked={isLinked}
                      onChange={(e) => setIsLinked(e.target.checked)}
                      className="h-4 w-4 accent-blue-600 rounded"
                    />
                    <span className="text-xs font-bold text-blue-600">Link to Schedule</span>
                  </label>
                </div>
                
                {isLinked && linkedTaskId !== "" && (
                  <div className="flex items-center justify-center gap-2 bg-slate-50 p-2 rounded-md border border-slate-200 mt-3">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Offset (Days)</Label>
                    <Input 
                      type="number" 
                      value={linkedTaskOffset} 
                      onChange={(e) => setLinkedTaskOffset(e.target.value === "" ? 0 : parseInt(e.target.value, 10))}
                      className="h-7 w-16 text-xs text-center px-1 shadow-sm"
                    />
                    <span className="text-[10px] text-slate-400 font-medium">
                      (- for lead before, + for lag after)
                    </span>
                  </div>
                )}
              </div>
              
              {/* Email Tag List Input */}
              <div className="pt-3 border-t border-slate-100">
                <Label className="text-xs font-semibold text-slate-700 block mb-1.5">Email</Label>
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
                  <Button type="button" onClick={handleAddEmail} className="bg-slate-900 hover:bg-slate-800 text-white px-4 h-10 shadow-sm">
                    Add
                  </Button>
                </div>
                
                {/* Visual Tags for added emails */}
                {formEmails.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formEmails.map((email, idx) => (
                      <span key={idx} className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium">
                        {email}
                        <button 
                          type="button" 
                          onClick={() => handleRemoveEmail(email)} 
                          className="hover:text-rose-600 transition-colors"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-2">
              <Label htmlFor="task-notes" className="text-xs font-semibold text-slate-700">Additional Notes (Optional)</Label>
              <textarea 
                id="task-notes" 
                rows={3}
                placeholder="Details, measurements, or materials needed..." 
                value={formNotes} 
                onChange={(e) => setFormNotes(e.target.value)} 
                className="w-full mt-1 p-2.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between sm:justify-between items-center pt-2 border-t">
            {editingItem ? (
              <Button variant="destructive" size="sm" onClick={handleDeleteItem} className="shadow-sm">
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)} className="shadow-sm">
                Cancel
              </Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" onClick={handleSaveItem}>
                {editingItem ? "Save Changes" : "Add Task"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="w-full text-center py-6 text-xs text-slate-500 border-t border-slate-200 mt-8">
        CleanBuild v1.00
      </div>
    </main>
  )
}