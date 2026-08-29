"use client"

import { useState, useEffect, useMemo } from "react"
import { get, set } from "idb-keyval"
import { syncManager } from "@/lib/syncManager"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

export interface SelectionItem {
  id: string
  title: string
  category: string
  vendorUrl: string
  price: string
  modelNumber: string
  notes: string
  status: "Selected" | "Under Review" | "Ordered" | "Delivered"
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

const CATEGORIES = [
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

const INITIAL_SELECTIONS: SelectionItem[] = [
  {
    id: "1",
    title: "Matte Black Rain Showerhead Set",
    category: "Plumbing Fixtures",
    vendorUrl: "https://www.build.com",
    price: "$289.00",
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
    vendorUrl: "https://www.homedepot.com",
    price: "$767.80",
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
    vendorUrl: "https://www.wayfair.com",
    price: "$1,150.00",
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
    vendorUrl: "https://www.amazon.com",
    price: "$145.00",
    modelNumber: "B08X3P912",
    notes: "Checking warm white 3000K LED compatibility.",
    status: "Under Review",
    checked: false,
    syncToExpenses: false,
  },
]

export default function SelectionsPage() {
  const [items, setItems] = useState<SelectionItem[]>([])
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>({
    "Plumbing Fixtures": 500,
    "Tile & Flooring": 800,
    "Lighting & Electrical": 300,
    "Cabinetry & Hardware": 1200,
  })
  const [selectedCategory, setSelectedCategory] = useState<string>("All Categories")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [isLoaded, setIsLoaded] = useState<boolean>(false)

  // Budget Allowance Modal
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)
  const [tempBudgetVal, setTempBudgetVal] = useState("")

  // Item Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [editingItem, setEditingItem] = useState<SelectionItem | null>(null)

  // Form State
  const [formTitle, setFormTitle] = useState("")
  const [formCategory, setFormCategory] = useState("Plumbing Fixtures")
  const [formUrl, setFormUrl] = useState("")
  const [formPrice, setFormPrice] = useState("")
  const [formModel, setFormModel] = useState("")
  const [formNotes, setFormNotes] = useState("")
  const [formStatus, setFormStatus] = useState<SelectionItem["status"]>("Selected")
  const [formSyncToExpenses, setFormSyncToExpenses] = useState<boolean>(false)

  useEffect(() => {
    async function loadData() {
      try {
        const savedItems = await get<SelectionItem[]>("jobflow_selections_items")
        const savedBudgets = await get<Record<string, number>>("jobflow_selections_budgets")

        if (savedItems && Array.isArray(savedItems) && savedItems.length > 0) {
          setItems(savedItems)
        } else {
          setItems(INITIAL_SELECTIONS)
        }

        if (savedBudgets) {
          setCategoryBudgets(savedBudgets)
        }

        setIsLoaded(true)

        const cloudItems = await syncManager.pullFromCloud("jobflow_selections_items")
        const cloudBudgets = await syncManager.pullFromCloud("jobflow_selections_budgets")

        if (cloudItems && Array.isArray(cloudItems)) {
          setItems(cloudItems)
        }
        if (cloudBudgets) {
          setCategoryBudgets(cloudBudgets)
        }
      } catch (e) {
        console.error("Error loading selections:", e)
        setIsLoaded(true)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    if (isLoaded) {
      const syncData = async () => {
        try {
          await set("jobflow_selections_items", items)
          await syncManager.pushToCloud("jobflow_selections_items", items)

          await set("jobflow_selections_budgets", categoryBudgets)
          await syncManager.pushToCloud("jobflow_selections_budgets", categoryBudgets)
        } catch (e) {
          console.error("Failed to sync selections:", e)
        }
      }
      syncData()
    }
  }, [items, categoryBudgets, isLoaded])

  const checkedCount = useMemo(() => items.filter((i) => i.checked).length, [items])

  const totalCost = useMemo(() => {
    return items.reduce((sum, item) => {
      if (!item.checked || !item.price) return sum
      const rawNum = parseFloat(item.price.replace(/[^0-9.]/g, ""))
      return sum + (isNaN(rawNum) ? 0 : rawNum)
    }, 0)
  }, [items])

  const activeCategoryCost = useMemo(() => {
    if (selectedCategory === "All Categories") return totalCost
    return items.reduce((sum, item) => {
      if (item.category !== selectedCategory || !item.checked || !item.price) return sum
      const rawNum = parseFloat(item.price.replace(/[^0-9.]/g, ""))
      return sum + (isNaN(rawNum) ? 0 : rawNum)
    }, 0)
  }, [items, selectedCategory, totalCost])

  const handleToggleCheck = (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)))
  }

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = selectedCategory === "All Categories" || item.category === selectedCategory
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.modelNumber.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [items, selectedCategory, searchQuery])

  const handleSaveBudget = () => {
    const num = parseFloat(tempBudgetVal) || 0
    setCategoryBudgets((prev) => ({ ...prev, [selectedCategory]: num }))
    setIsBudgetModalOpen(false)
  }

  const handleOpenAdd = () => {
    setEditingItem(null)
    setFormTitle("")
    setFormCategory(selectedCategory !== "All Categories" ? selectedCategory : "Plumbing Fixtures")
    setFormUrl("")
    setFormPrice("")
    setFormModel("")
    setFormNotes("")
    setFormStatus("Selected")
    setFormSyncToExpenses(false)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: SelectionItem) => {
    setEditingItem(item)
    setFormTitle(item.title)
    setFormCategory(item.category)
    setFormUrl(item.vendorUrl)
    setFormPrice(item.price)
    setFormModel(item.modelNumber)
    setFormNotes(item.notes)
    setFormStatus(item.status)
    setFormSyncToExpenses(!!item.syncToExpenses)
    setIsModalOpen(true)
  }

  const handleSaveItem = async () => {
    if (!formTitle.trim()) return
    const itemPriceNumber = parseFloat(formPrice.replace(/[^0-9.]/g, "")) || 0
    let updatedItem: SelectionItem

    if (editingItem) {
      updatedItem = {
        ...editingItem,
        title: formTitle.trim(),
        category: formCategory,
        vendorUrl: formUrl.trim(),
        price: formPrice.trim(),
        modelNumber: formModel.trim(),
        notes: formNotes.trim(),
        status: formStatus,
        checked: formSyncToExpenses ? true : editingItem.checked,
        syncToExpenses: formSyncToExpenses,
      }
      setItems((prev) => prev.map((i) => (i.id === editingItem.id ? updatedItem : i)))
    } else {
      updatedItem = {
        id: Date.now().toString(),
        title: formTitle.trim(),
        category: formCategory,
        vendorUrl: formUrl.trim(),
        price: formPrice.trim(),
        modelNumber: formModel.trim(),
        notes: formNotes.trim(),
        status: formStatus,
        checked: true,
        syncToExpenses: formSyncToExpenses,
      }
      setItems((prev) => [updatedItem, ...prev])
    }

    if (formSyncToExpenses) {
      try {
        const existingExpenses = (await get<ExpenseItem[]>("builderlite_expenses")) || []
        const filteredExpenses = editingItem
          ? existingExpenses.filter((e) => e.id !== parseInt(editingItem.id))
          : existingExpenses

        const newExpenseRecord: ExpenseItem = {
          id: parseInt(updatedItem.id) || Date.now(),
          description: `Selection: ${updatedItem.title} (${updatedItem.category})`,
          materials: itemPriceNumber,
          labor: 0,
          date: new Date().toISOString().split("T")[0],
        }

        const newExpenseList = [newExpenseRecord, ...filteredExpenses]
        await set("builderlite_expenses", newExpenseList)
        await syncManager.pushToCloud("builderlite_expenses", newExpenseList)
        window.dispatchEvent(new Event("expenses-updated"))
      } catch (err) {
        console.error(err)
      }
    }

    setIsModalOpen(false)
  }

  const handleDeleteItem = async () => {
    if (!editingItem) return
    setItems((prev) => prev.filter((i) => i.id !== editingItem.id))
    
    try {
      const existingExpenses = (await get<ExpenseItem[]>("builderlite_expenses")) || []
      const filteredExpenses = existingExpenses.filter((e) => e.id !== parseInt(editingItem.id))
      await set("builderlite_expenses", filteredExpenses)
      await syncManager.pushToCloud("builderlite_expenses", filteredExpenses)
      window.dispatchEvent(new Event("expenses-updated"))
    } catch (err) {
      console.error(err)
    }
    setIsModalOpen(false)
  }

  const getStatusBadge = (status: SelectionItem["status"]) => {
    switch (status) {
      case "Selected":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Selected</Badge>
      case "Under Review":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Under Review</Badge>
      case "Ordered":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Ordered</Badge>
      case "Delivered":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Delivered</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const currentCategoryAllowance = categoryBudgets[selectedCategory] || 0
  const allowanceDiff = currentCategoryAllowance - activeCategoryCost

  return (
    <main className="p-6 bg-slate-100 min-h-screen space-y-6 text-slate-950 flex flex-col">
      
      <div className="bg-slate-900 text-white p-6 md:px-8 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:h-[140px]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">🛍️ Material Selections & Links</h1>
          </div>
          <p className="text-sm font-medium text-orange-400 mt-1.5 leading-relaxed max-w-2xl">
            Select items using checkboxes to calculate active project totals and track budget targets per category.
          </p>
        </div>

        {/* MOBILE CENTERED FIX APPLIED HERE */}
        <div className="flex items-center justify-center w-full md:w-auto gap-2 shrink-0">
          <div className="bg-slate-800/80 border border-slate-700 py-1.5 px-3 rounded-lg text-right">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Checked Total</span>
            <span className="text-base font-extrabold text-emerald-400">
              ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <Button
            size="sm"
            onClick={handleOpenAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white h-10 text-xs font-semibold px-4 shadow-sm"
          >
            + Add Item
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border shadow-sm bg-white flex-1">
        <div className="p-6 space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            <div className="md:col-span-1 space-y-2">
              <div className="bg-white p-3 rounded-xl border shadow-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-2">
                  Categories
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

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTempBudgetVal(currentCategoryAllowance ? currentCategoryAllowance.toString() : "")
                        setIsBudgetModalOpen(true)
                      }}
                      className="h-8 text-xs border-slate-300"
                    >
                      🎯 Set Budget Target
                    </Button>
                  </div>
                </div>
              )}

              <div className="bg-white p-3 rounded-xl border shadow-xs">
                <Input
                  placeholder="Search items, model specs, notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 text-xs bg-slate-50"
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
                              onChange={() => handleToggleCheck(item.id)}
                              className="mt-1 h-4 w-4 rounded accent-indigo-600 cursor-pointer"
                            />
                            <div>
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge variant="outline" className={`text-[10px] font-semibold ${item.syncToExpenses ? "bg-white text-emerald-800 border-emerald-300" : item.checked ? "bg-white text-indigo-700 border-indigo-200" : "bg-slate-50 text-slate-500"}`}>
                                  {item.category}
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

                          <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(item)} className="h-7 text-xs text-slate-500 hover:bg-slate-100">
                            Edit
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 pt-1 space-y-3 text-xs text-slate-600">
                        <div className={`grid grid-cols-2 gap-2 p-2.5 rounded-lg border ${item.syncToExpenses ? "bg-white/90 border-emerald-200" : item.checked ? "bg-white/80 border-indigo-100" : "bg-slate-50 border-slate-100"}`}>
                          <div>
                            <span className="text-slate-400 font-medium block text-[10px] uppercase">Price</span>
                            <span className="font-bold text-slate-900">{item.price || "N/A"}</span>
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
                    <p className="text-slate-500 text-sm font-medium">No items found in {selectedCategory}.</p>
                    <Button variant="outline" size="sm" onClick={handleOpenAdd} className="mt-3 text-xs">
                      + Add First Item
                    </Button>
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>
      </Card>

      <Dialog open={isBudgetModalOpen} onOpenChange={setIsBudgetModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Set Budget Target for {selectedCategory}</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="budget-input">Estimated Allowance / Budget ($)</Label>
            <Input
              id="budget-input"
              type="number"
              placeholder="e.g. 1000"
              value={tempBudgetVal}
              onChange={(e) => setTempBudgetVal(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBudgetModalOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-indigo-600 text-white" onClick={handleSaveBudget}>
              Save Target
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Material Selection" : "Add New Material Selection"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div>
              <Label htmlFor="item-title">Item Name / Title *</Label>
              <Input id="item-title" placeholder="e.g. Kohler Pull-Down Kitchen Faucet" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="item-cat">Category</Label>
                <select
                  id="item-cat"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full h-9 border rounded-md px-3 text-sm bg-white"
                >
                  {CATEGORIES.filter((c) => c !== "All Categories").map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="item-status">Status</Label>
                <select
                  id="item-status"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as SelectionItem["status"])}
                  className="w-full h-9 border rounded-md px-3 text-sm bg-white"
                >
                  <option value="Selected">Selected</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Ordered">Ordered</option>
                  <option value="Delivered">Delivered</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="item-url">Product Link / URL</Label>
              <Input id="item-url" placeholder="https://www.homedepot.com/p/..." value={formUrl} onChange={(e) => setFormUrl(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="item-price">Est. Price</Label>
                <Input id="item-price" placeholder="e.g. $249.00" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="item-model">Model / SKU #</Label>
                <Input id="item-model" placeholder="e.g. K-596-VS" value={formModel} onChange={(e) => setFormModel(e.target.value)} />
              </div>
            </div>

            <div>
              <Label htmlFor="item-notes">Notes / Requirements</Label>
              <Input id="item-notes" placeholder="e.g. Needs 3/8 valve connection, matte black finish" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
            </div>

            <div className="flex items-center justify-between p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg">
              <div>
                <Label htmlFor="sync-expenses-toggle" className="font-semibold text-emerald-950 text-xs cursor-pointer block">
                  💰 Sync to Expenses Tab
                </Label>
                <p className="text-[11px] text-emerald-800">
                  Automatically logs material price under Project Expenses & updates Dashboard totals.
                </p>
              </div>
              <input
                id="sync-expenses-toggle"
                type="checkbox"
                checked={formSyncToExpenses}
                onChange={(e) => setFormSyncToExpenses(e.target.checked)}
                className="h-5 w-5 accent-emerald-600 rounded cursor-pointer shrink-0"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between sm:justify-between items-center">
            {editingItem ? (
              <Button variant="destructive" size="sm" onClick={handleDeleteItem}>
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSaveItem}>
                {editingItem ? "Save Changes" : "Add Selection"}
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