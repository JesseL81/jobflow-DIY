"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsOpen((open) => !open)
      }
      if (e.key === "Escape") setIsOpen(false)
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  if (!isOpen) return null

  const routes = [
    { name: "📊 Dashboard", path: "/dashboard" },
    { name: "📐 Vision Board", path: "/vision-board" },
    { name: "🛍️ Material Selections", path: "/selections" },
    { name: "📅 Schedule & Tasks", path: "/schedule" },
    { name: "✅ Punch List & To-Do's", path: "/punch-list" },
    { name: "💰 Project Expenses", path: "/expenses" },
    { name: "📁 Documents & Plans", path: "/documents" },
  ]

  const filteredRoutes = routes.filter(route => 
    route.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (path: string) => {
    setIsOpen(false)
    setSearch("")
    router.push(path)
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-sm flex items-start justify-center pt-[15vh]" onClick={() => setIsOpen(false)}>
      <div 
        className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-slate-100">
          <span className="text-slate-400 mr-2">🔍</span>
          <input
            autoFocus
            className="flex-1 bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400"
            placeholder="Search or jump to..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">ESC</span>
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredRoutes.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">No results found.</div>
          ) : (
            filteredRoutes.map((route) => (
              <button
                key={route.path}
                onClick={() => handleSelect(route.path)}
                className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors flex items-center justify-between group"
              >
                {route.name}
                <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">Jump →</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}