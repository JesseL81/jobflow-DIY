"use client"

import { useState, useEffect } from "react"
import { useOfflineSync } from "@/hooks/useOfflineSync"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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

const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return ""
  const cleanDate = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr
  const [year, month, day] = cleanDate.split("-")
  if (!year || !month || !day) return dateStr
  return `${parseInt(month, 10)}/${parseInt(day, 10)}/${year.slice(-2)}`
}

export default function ExpenseTracker() {
  // 1. Universal Sync Hooks (Replaces 60+ lines of custom DB logic)
  const [expenses, setExpenses] = useOfflineSync<Expense[]>("cleanbuild_expenses", INITIAL_EXPENSES)
  const [totalBudget, setTotalBudget] = useOfflineSync<number>("cleanbuild_total_budget", 23402)
  
  const [projectName, setProjectName] = useState("My Project")

  // Modal States
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form Fields
  const [date, setDate] = useState("")
  const [description, setDescription] = useState("")
  const [materials, setMaterials] = useState<string>("")
  const [labor, setLabor] = useState<string>("")
  const [receiptPhoto, setReceiptPhoto] = useState<string>("")
  const [tempBudget, setTempBudget] = useState<string>("23402")
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null)

  // Keep Temp Budget synced with Total Budget when it loads
  useEffect(() => {
    setTempBudget(totalBudget.toString())
  }, [totalBudget])

  // Load project name from sidebar
  useEffect(() => {
    const loadProjectName = () => {
      const savedName = localStorage.getItem("cleanbuild_project_name")
      if (savedName) setProjectName(savedName)
    }
    loadProjectName()
    window.addEventListener("project-name-updated", loadProjectName)
    return () => window.removeEventListener("project-name-updated", loadProjectName)
  }, [])

  // Calculations
  const totalMaterials = expenses.reduce((sum, item) => sum + (item.materials || 0), 0)
  const totalLabor = expenses.reduce((sum, item) => sum + (item.labor || 0), 0)
  const totalSpent = totalMaterials + totalLabor
  const percentUsed = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0

  const radius = 24
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (Math.min(percentUsed, 100) / 100) * circumference

  const handleOpenModal = (expense?: Expense) => {
    setIsSubmitting(false)
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
      setMaterials("") 
      setLabor("")     
      setReceiptPhoto("")
    }
    setIsDialogOpen(true)
  }

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

  const handleSaveExpense = async () => {
    if (!description.trim() || !date || isSubmitting) return

    setIsSubmitting(true)

    try {
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

      await setExpenses(updatedList)
      
      // Notify Dashboard
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("expenses-updated"))
      }
      
      setIsDialogOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteExpense = async (id: number) => {
    const updated = expenses.filter((e) => e.id !== id)
    await setExpenses(updated)
    
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("expenses-updated"))
    }
    
    setIsDialogOpen(false)
  }

  const handleSaveBudget = async () => {
    const parsed = parseFloat(tempBudget) || 0
    await setTotalBudget(parsed)
    
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("expenses-updated"))
    }
    
    setIsBudgetDialogOpen(false)
  }

  const handleExportCSV = () => {
    const safeName = projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const headers = ["Date", "Description", "Materials ($)", "Labor ($)", "Total ($)"]
    
    const rows = expenses.map((e) => {
      const mat = e.materials || 0;
      const lab = e.labor || 0;
      return [
        e.date,
        `"${e.description.replace(/"/g, '""')}"`,
        mat.toFixed(2),
        lab.toFixed(2),
        (mat + lab).toFixed(2),
      ]
    })

    const brandingRow = `"CleanBuild - Project Expense Report"\n`
    const titleRow = `"Project: ${projectName.replace(/"/g, '""')}"\n\n`
    const csvContent = "data:text/csv;charset=utf-8," + brandingRow + titleRow + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${safeName}_Expenses_Report_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <main className="p-6 bg-slate-100 min-h-screen space-y-6 flex flex-col text-slate-950">
      
      <div className="bg-slate-900 text-white p-6 md:px-8 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:h-[140px]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">💰 Project Expense Tracker</h1>
          </div>
          <p className="text-sm font-medium text-orange-400 mt-1.5 leading-relaxed max-w-2xl">
            Track materials vs. labor costs and store receipt documentation.
          </p>
        </div>

        <div className="flex items-center justify-center w-full md:w-auto gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-white border-slate-700 bg-slate-800/80 hover:bg-slate-700 hover:text-white h-10 text-xs font-semibold px-4 shadow-sm"
          >
            📊 Export CSV
          </Button>
          <Button
            size="sm"
            onClick={() => handleOpenModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white h-10 text-xs font-semibold px-4 shadow-sm"
          >
            + Log Expense
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border shadow-sm bg-white flex-1">
        <div className="p-6 space-y-6">

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-white border border-slate-200 shadow-xs rounded-xl">
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

            <Card className="bg-white border border-slate-200 shadow-xs rounded-xl">
              <CardHeader className="pb-2 p-5">
                <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Materials Spent
                </CardDescription>
                <CardTitle className="text-2xl font-extrabold text-blue-600 mt-1">${totalMaterials.toLocaleString()}</CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-white border border-slate-200 shadow-xs rounded-xl">
              <CardHeader className="pb-2 p-5">
                <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Labor Spent
                </CardDescription>
                <CardTitle className="text-2xl font-extrabold text-purple-600 mt-1">${totalLabor.toLocaleString()}</CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-white border border-slate-200 shadow-xs rounded-xl">
              <CardHeader className="pb-2 p-5">
                <div className="flex justify-between items-center">
                  <div>
                    <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Total Spent
                    </CardDescription>
                    <CardTitle className="text-2xl font-extrabold text-indigo-600 mt-1">${totalSpent.toLocaleString()}</CardTitle>
                  </div>
                  <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="28" cy="28" r={radius} stroke="currentColor" strokeWidth="4.5" fill="transparent" className="text-slate-100" />
                      <circle
                        cx="28"
                        cy="28"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="4.5"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className={`${percentUsed > 90 ? "text-rose-500" : percentUsed > 75 ? "text-amber-500" : "text-emerald-500"} transition-all duration-500`}
                      />
                    </svg>
                    <span className={`absolute text-xs font-bold ${percentUsed > 100 ? "text-rose-600" : "text-slate-700"}`}>
                      {percentUsed}%
                    </span>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="bg-white border border-slate-200 shadow-xs rounded-xl">
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

          <Card className="bg-white border border-slate-200 shadow-xs rounded-xl">
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

        </div>
      </Card>

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
                  placeholder="0.00"
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
                  placeholder="0.00"
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
              <Button 
                className="bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50" 
                onClick={handleSaveExpense}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : editingExpense ? "Update Expense" : "Save Expense"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
      
      <div className="w-full text-center py-6 text-xs text-slate-500 border-t border-slate-200 mt-8">
        CleanBuild v1.00
      </div>
    </main>
  )
}