"use client"

import { useState, useEffect } from "react"
import { get, set } from "idb-keyval"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Expense {
  id: number
  date: string
  description: string
  materials: number
  labor: number
  receiptPhoto?: string
}

const INITIAL_EXPENSES: Expense[] = [
  { id: 1, date: "2026-07-10", description: "Lumber, Screws & Post Anchors", materials: 450, labor: 0 },
  { id: 2, date: "2026-07-12", description: "City Permit & Inspection Fee", materials: 150, labor: 0 },
  { id: 3, date: "2026-07-15", description: "Concrete Footing Pour Help", materials: 200, labor: 350 },
  { id: 4, date: "2026-07-18", description: "Composite Decking & Fasteners", materials: 1850, labor: 0 },
  { id: 5, date: "2026-07-20", description: "Railing Installation Subcontractor", materials: 120, labor: 400 },
]

// Helper: Formats YYYY-MM-DD into M/D/YY for display
const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return ""
  const cleanDate = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr
  const [year, month, day] = cleanDate.split("-")
  if (!year || !month || !day) return dateStr
  return `${parseInt(month, 10)}/${parseInt(day, 10)}/${year.slice(-2)}`
}

export default function ExpenseTracker() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [totalBudget, setTotalBudget] = useState<number>(23402)

  // Modal States
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  // Form Fields
  const [date, setDate] = useState("")
  const [description, setDescription] = useState("")
  const [materials, setMaterials] = useState<string>("0")
  const [labor, setLabor] = useState<string>("0")
  const [receiptPhoto, setReceiptPhoto] = useState<string>("")
  const [tempBudget, setTempBudget] = useState<string>("23402")

  // Lightbox State
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null)

  // Load from IndexedDB
  useEffect(() => {
    async function loadData() {
      try {
        const savedExpenses = await get<Expense[]>("builderlite_expenses")
        const savedBudget = await get<number>("builderlite_total_budget")

        if (savedExpenses && Array.isArray(savedExpenses) && savedExpenses.length > 0) {
          setExpenses(savedExpenses)
        } else {
          setExpenses(INITIAL_EXPENSES)
          await saveExpensesToIDB(INITIAL_EXPENSES)
        }

        if (savedBudget !== undefined) {
          setTotalBudget(savedBudget)
          setTempBudget(savedBudget.toString())
        } else {
          await saveBudgetToIDB(23402)
        }
      } catch (e) {
        console.error("Failed to load expenses from IndexedDB:", e)
        setExpenses(INITIAL_EXPENSES)
      }
    }
    loadData()
  }, [])

  // Save changes to IndexedDB + trigger sync event
  const saveExpensesToIDB = async (updated: Expense[]) => {
    setExpenses(updated)
    try {
      await set("builderlite_expenses", updated)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("expenses-updated"))
      }
    } catch (e) {
      console.error("Failed to save expenses:", e)
    }
  }

  const saveBudgetToIDB = async (newBudget: number) => {
    setTotalBudget(newBudget)
    try {
      await set("builderlite_total_budget", newBudget)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("expenses-updated"))
      }
    } catch (e) {
      console.error("Failed to save budget:", e)
    }
  }

  // Calculations
  const totalMaterials = expenses.reduce((sum, item) => sum + (item.materials || 0), 0)
  const totalLabor = expenses.reduce((sum, item) => sum + (item.labor || 0), 0)
  const totalSpent = totalMaterials + totalLabor
  const percentUsed = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0

  // Open Modal for Add/Edit
  const handleOpenModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense)
      setDate(expense.date)
      setDescription(expense.description)
      setMaterials(expense.materials.toString())
      setLabor(expense.labor.toString())
      setReceiptPhoto(expense.receiptPhoto || "")
    } else {
      setEditingExpense(null)
      const todayStr = new Date().toISOString().split("T")[0]
      setDate(todayStr)
      setDescription("")
      setMaterials("0")
      setLabor("0")
      setReceiptPhoto("")
    }
    setIsDialogOpen(true)
  }

  // Handle Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return
    const file = e.target.files[0]
    const reader = new FileReader()
    reader.onloadend = () => {
      if (reader.result) {
        setReceiptPhoto(reader.result as string)
      }
    }
    reader.readAsDataURL(file)
  }

  // Save Expense Logic
  const handleSaveExpense = async () => {
    if (!description.trim() || !date) return

    const matVal = parseFloat(materials) || 0
    const labVal = parseFloat(labor) || 0

    let updatedList: Expense[] = []

    if (editingExpense) {
      updatedList = expenses.map((item) =>
        item.id === editingExpense.id
          ? {
              ...item,
              date,
              description: description.trim(),
              materials: matVal,
              labor: labVal,
              receiptPhoto: receiptPhoto || undefined,
            }
          : item
      )
    } else {
      const newEntry: Expense = {
        id: Date.now(),
        date,
        description: description.trim(),
        materials: matVal,
        labor: labVal,
        receiptPhoto: receiptPhoto || undefined,
      }
      updatedList = [newEntry, ...expenses]
    }

    await saveExpensesToIDB(updatedList)
    setIsDialogOpen(false)
  }

  // Delete Expense
  const handleDeleteExpense = async (id: number) => {
    const updated = expenses.filter((e) => e.id !== id)
    await saveExpensesToIDB(updated)
    setIsDialogOpen(false)
  }

  // Save Budget Modal
  const handleSaveBudget = async () => {
    const parsed = parseFloat(tempBudget) || 0
    await saveBudgetToIDB(parsed)
    setIsBudgetDialogOpen(false)
  }

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ["ID", "Date", "Description", "Materials ($)", "Labor ($)", "Total ($)"]
    const rows = expenses.map((e) => [
      e.id,
      e.date,
      `"${e.description.replace(/"/g, '""')}"`,
      e.materials,
      e.labor,
      e.materials + e.labor,
    ])

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Expenses_Report_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <main className="p-8 max-w-6xl mx-auto space-y-6 bg-slate-100 min-h-screen text-slate-950">
      {/* Header Banner */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">Project Expense Tracker</h2>
            <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50 font-semibold px-3 py-1">
              JobFlow
            </Badge>
          </div>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">
            Track materials vs. labor costs and store receipt documentation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="bg-white hover:bg-slate-50 border-slate-300 text-slate-700 text-xs h-9 font-semibold shadow-xs"
          >
            📊 Export CSV
          </Button>
          <Button
            onClick={() => handleOpenModal()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 font-semibold shadow-xs"
          >
            + Log Expense
          </Button>
        </div>
      </header>

      {/* Overview Metric Cards (Styled identically to Header Banner) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl relative group">
          <CardHeader className="pb-2 p-5">
            <div className="flex justify-between items-center">
              <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Budget
              </CardDescription>
              <button
                onClick={() => {
                  setTempBudget(totalBudget.toString())
                  setIsBudgetDialogOpen(true)
                }}
                className="text-xs text-indigo-600 hover:underline font-bold"
              >
                Edit
              </button>
            </div>
            <CardTitle className="text-2xl font-extrabold text-slate-900 mt-1">${totalBudget.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
          <CardHeader className="pb-2 p-5">
            <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Materials Spend
            </CardDescription>
            <CardTitle className="text-2xl font-extrabold text-blue-600 mt-1">${totalMaterials.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
          <CardHeader className="pb-2 p-5">
            <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Labor Spend
            </CardDescription>
            <CardTitle className="text-2xl font-extrabold text-purple-600 mt-1">${totalLabor.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
          <CardHeader className="pb-2 p-5">
            <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Spent
            </CardDescription>
            <CardTitle className="text-2xl font-extrabold text-indigo-600 mt-1">${totalSpent.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
          <CardHeader className="pb-2 p-5">
            <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Remaining Budget
            </CardDescription>
            <CardTitle className={`text-2xl font-extrabold mt-1 ${totalBudget - totalSpent < 0 ? "text-rose-600" : "text-emerald-600"}`}>
              ${(totalBudget - totalSpent).toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Spend Progress Bar Container */}
      <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
        <CardHeader className="pb-3 p-6">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-bold text-slate-900">Overall Spend Progress</CardTitle>
            <span className="text-xs font-bold text-slate-600">
              {percentUsed}% of ${totalBudget.toLocaleString()}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden p-0.5 border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percentUsed > 90
                  ? "bg-rose-500"
                  : percentUsed > 75
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Expense Ledger Table Container */}
      <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
        <CardHeader className="p-6 pb-2">
          <CardTitle className="text-lg font-bold text-slate-900">Detailed Expense Ledger</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-2">
          {expenses.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed rounded-lg">
              No expenses recorded yet. Click <strong>"+ Log Expense"</strong> to add one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-200 bg-slate-50">
                    <TableHead className="font-bold text-slate-600 text-xs">Receipt</TableHead>
                    <TableHead className="font-bold text-slate-600 text-xs">Date</TableHead>
                    <TableHead className="font-bold text-slate-600 text-xs">Description</TableHead>
                    <TableHead className="text-right font-bold text-slate-600 text-xs">Materials ($)</TableHead>
                    <TableHead className="text-right font-bold text-slate-600 text-xs">Labor ($)</TableHead>
                    <TableHead className="text-right font-bold text-slate-600 text-xs">Line Total</TableHead>
                    <TableHead className="text-right font-bold text-slate-600 text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => {
                    const lineTotal = (expense.materials || 0) + (expense.labor || 0)
                    return (
                      <TableRow key={expense.id} className="hover:bg-slate-50/80 border-b border-slate-100">
                        <TableCell className="w-16">
                          {expense.receiptPhoto ? (
                            <img
                              src={expense.receiptPhoto}
                              alt="Receipt"
                              className="h-10 w-10 object-cover rounded border border-slate-200 cursor-pointer hover:opacity-80"
                              onClick={() => setLightboxPhoto(expense.receiptPhoto || null)}
                              title="Click to expand receipt"
                            />
                          ) : (
                            <span className="text-xs text-slate-300 italic">None</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-slate-600 text-xs whitespace-nowrap">
                          {formatDisplayDate(expense.date)}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-900 text-xs">{expense.description}</TableCell>
                        <TableCell className="text-right text-blue-600 font-semibold text-xs">
                          {expense.materials ? `$${expense.materials.toLocaleString()}` : "-"}
                        </TableCell>
                        <TableCell className="text-right text-purple-600 font-semibold text-xs">
                          {expense.labor ? `$${expense.labor.toLocaleString()}` : "-"}
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-900 text-xs">
                          ${lineTotal.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                            onClick={() => handleOpenModal(expense)}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Expense Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Edit Expense Entry" : "Log New Expense"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="expense-date">Date</Label>
              <Input
                id="expense-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expense-desc">Description</Label>
              <Input
                id="expense-desc"
                placeholder="e.g. Concrete, Lumber, Electrical Sub"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="expense-mat">Materials Cost ($)</Label>
                <Input
                  id="expense-mat"
                  type="number"
                  min="0"
                  step="0.01"
                  value={materials}
                  onChange={(e) => setMaterials(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="expense-lab">Labor Cost ($)</Label>
                <Input
                  id="expense-lab"
                  type="number"
                  min="0"
                  step="0.01"
                  value={labor}
                  onChange={(e) => setLabor(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Attach Receipt Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="cursor-pointer"
              />

              {receiptPhoto && (
                <div className="relative h-28 w-full border rounded-md overflow-hidden bg-slate-50 mt-1">
                  <img src={receiptPhoto} alt="Receipt preview" className="h-full w-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setReceiptPhoto("")}
                    className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-rose-600"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex justify-between items-center sm:justify-between">
            {editingExpense ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteExpense(editingExpense.id)}
              >
                Delete
              </Button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSaveExpense}>
                {editingExpense ? "Update Expense" : "Save Expense"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Budget Dialog */}
      <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Update Total Budget</DialogTitle>
          </DialogHeader>

          <div className="grid gap-2 py-2">
            <Label htmlFor="project-budget">Project Total Budget ($)</Label>
            <Input
              id="project-budget"
              type="number"
              min="0"
              value={tempBudget}
              onChange={(e) => setTempBudget(e.target.value)}
            />
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsBudgetDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSaveBudget}>
              Save Budget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox Dialog */}
      <Dialog open={Boolean(lightboxPhoto)} onOpenChange={() => setLightboxPhoto(null)}>
        <DialogContent className="max-w-[90vw] md:max-w-3xl h-[80vh] p-2 bg-black/95 border-slate-800 flex flex-col items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center p-2">
            {lightboxPhoto && (
              <img
                src={lightboxPhoto}
                alt="Receipt detail"
                className="max-h-full max-w-full object-contain rounded-sm"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}