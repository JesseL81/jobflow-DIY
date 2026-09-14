"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useOfflineSync } from "@/hooks/useOfflineSync"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PaywallOverlay } from "@/components/paywall-overlay"

import JSZip from "jszip"
import { saveAs } from "file-saver"

export interface DocumentItem {
  id: string
  name: string
  folder: string
  size: number
  dateAdded: string
  fileData?: string // Stores the base64 data so we can actually open/download it!
}

const DEFAULT_FOLDERS = [
  "All Files",
  "Plans & Permits",
  "Plumbing Fixtures",
  "Tile & Flooring",
  "Lighting & Electrical",
  "Appliances",
  "Paint & Finishes",
  "Cabinetry & Hardware",
  "Doors & Trim",
  "Other",
]

const INITIAL_DOCS: DocumentItem[] = [
  {
    id: "1",
    name: "Main_Floor_Plan_v2_Stamped.pdf",
    folder: "Plans & Permits",
    size: 2450000,
    dateAdded: new Date().toISOString().split("T")[0],
  },
  {
    id: "2",
    name: "Kohler_Shower_Specs.pdf",
    folder: "Plumbing Fixtures",
    size: 845000,
    dateAdded: new Date().toISOString().split("T")[0],
  },
]

// Helper to format bytes into readable sizes
function formatBytes(bytes: number, decimals = 1) {
  if (!+bytes) return "0 Bytes"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useOfflineSync<DocumentItem[]>("cleanbuild_documents_items", INITIAL_DOCS)
  const [folders, setFolders] = useOfflineSync<string[]>("cleanbuild_documents_folders", DEFAULT_FOLDERS)
  
  const [projectName, setProjectName] = useState("My Project")

  // Auth & Permissions
  const [isGuest, setIsGuest] = useState(false)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [accountTier, setAccountTier] = useState<string>("free")
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  const [selectedFolder, setSelectedFolder] = useState<string>("All Files")
  const [searchQuery, setSearchQuery] = useState<string>("")
  
  // Custom Folder State
  const [isAddingFolder, setIsAddingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")

  // Export State
  const [isExporting, setIsExporting] = useState(false)

  // Native File Picker Ref
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null)
  const [formName, setFormName] = useState("")
  const [formFolder, setFormFolder] = useState("")

  useEffect(() => {
    const loadProjectName = () => {
      const savedName = localStorage.getItem("cleanbuild_project_name")
      if (savedName) setProjectName(savedName)
    }
    loadProjectName()
    window.addEventListener("project-name-updated", loadProjectName)
    return () => window.removeEventListener("project-name-updated", loadProjectName)
  }, [])

  useEffect(() => {
    const fetchUserAndPermissions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.email) return

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
            setIsReadOnly(guestInvite.permissions.documents === "read-only")
          }
        }
      } catch (error) {
        console.error("Failed to load document permissions:", error)
      } finally {
        setIsCheckingAuth(false)
      }
    }
    fetchUserAndPermissions()
  }, [])

  const showPaywall = !isCheckingAuth && !isGuest && accountTier === "free"

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchesFolder = selectedFolder === "All Files" || (doc.folder || "Other") === selectedFolder
      const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesFolder && matchesSearch
    })
  }, [documents, selectedFolder, searchQuery])

  const handleAddFolder = async () => {
    if (isReadOnly || !newFolderName.trim()) return
    const trimmed = newFolderName.trim()
    if (!folders.includes(trimmed)) {
      await setFolders([...folders, trimmed])
    }
    setNewFolderName("")
    setIsAddingFolder(false)
    setSelectedFolder(trimmed)
  }

  // --- Handle Native File Selection with Base64 Conversion ---
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly || !e.target.files?.length) return
    
    const files = Array.from(e.target.files)
    const newDocs: DocumentItem[] = []

    for (const file of files) {
      try {
        const fileData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        newDocs.push({
          id: Date.now().toString() + Math.random().toString(36).substring(7),
          name: file.name,
          folder: selectedFolder !== "All Files" ? selectedFolder : "Plans & Permits",
          size: file.size,
          dateAdded: new Date().toISOString().split("T")[0],
          fileData,
        })
      } catch (err) {
        console.error("Error converting file to base64", err)
      }
    }

    await setDocuments([...newDocs, ...documents])
    
    // Reset input so the same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // --- Handle Opening File in Browser ---
  const handleOpenFile = (doc: DocumentItem) => {
    if (!doc.fileData) {
      alert("This is a placeholder example file. Please upload a real file to view it.")
      return
    }

    try {
      const parts = doc.fileData.split(',')
      const mimeString = parts[0].split(':')[1].split(';')[0]
      const byteString = atob(parts[1])
      const ab = new ArrayBuffer(byteString.length)
      const ia = new Uint8Array(ab)
      
      for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i)
      }
      
      const blob = new Blob([ab], { type: mimeString })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (err) {
      console.error("Failed to open file", err)
      alert("Unable to open this file format.")
    }
  }

  // --- Handle ZIP Export ---
  const handleExportAll = async () => {
    if (!documents || documents.length === 0) return
    setIsExporting(true)
    
    try {
      const zip = new JSZip()
      const safeProjectName = projectName.replace(/[^a-z0-9]/gi, '_') || "CleanBuild_Project"
      const projectFolder = zip.folder(safeProjectName)
      
      if (!projectFolder) throw new Error("Could not create zip folder")
      
      documents.forEach((doc) => {
        // Skip dummy files or files that failed to process
        if (doc.fileData) {
          const base64Data = doc.fileData.split(',')[1]
          if (base64Data) {
            // Drop it directly into the subfolder it belongs in
            projectFolder.folder(doc.folder || "Other")?.file(doc.name, base64Data, { base64: true })
          }
        }
      })
      
      const zipContent = await zip.generateAsync({ type: "blob" })
      const todayStr = new Date().toISOString().split("T")[0]
      saveAs(zipContent, `${safeProjectName}_Documents_${todayStr}.zip`)
    } catch (error) {
      console.error("Export failed:", error)
      alert("Failed to export documents.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleOpenEdit = (doc: DocumentItem) => {
    if (isReadOnly) return
    setEditingDoc(doc)
    setFormName(doc.name)
    setFormFolder(doc.folder || "Other")
    setIsModalOpen(true)
  }

  const handleSaveDoc = async () => {
    if (isReadOnly || !formName.trim() || !editingDoc) return

    const updatedDoc: DocumentItem = {
      ...editingDoc,
      name: formName.trim(),
      folder: formFolder,
    }
    
    const updatedList = documents.map((d) => (d.id === editingDoc.id ? updatedDoc : d))
    await setDocuments(updatedList)
    setIsModalOpen(false)
  }

  const handleDeleteDoc = async () => {
    if (isReadOnly || !editingDoc) return
    const updatedList = documents.filter((d) => d.id !== editingDoc.id)
    await setDocuments(updatedList)
    setIsModalOpen(false)
  }

  return (
    <main className={`p-6 bg-slate-100 flex flex-col text-slate-950 relative ${showPaywall ? 'h-screen overflow-hidden' : 'min-h-screen space-y-6'}`}>
      <PaywallOverlay show={showPaywall} />

      <div className="bg-slate-900 text-white p-6 md:px-8 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:h-[140px] shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            📁 Documents & Files {isReadOnly && <span className="text-sm bg-slate-700 px-2 py-1 rounded-md text-slate-300 font-semibold ml-2">Read-Only</span>}
          </h1>
          <p className="text-sm font-medium text-orange-400 mt-1.5 leading-relaxed max-w-2xl">
            {isReadOnly ? "View project files and plans." : "Drag, drop, and manage project files. Organized exactly like your computer."}
          </p>
        </div>

        <div className="flex items-center justify-center w-full md:w-auto gap-3 shrink-0">
          {(documents || []).length > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={isExporting}
              onClick={handleExportAll}
              className="text-white border-slate-700 bg-slate-800/80 hover:bg-slate-700 hover:text-white h-9 text-xs font-semibold px-4 shadow-sm"
            >
              {isExporting ? "⏳ Zipping..." : "📦 Download All"}
            </Button>
          )}

          {!isReadOnly && (
            <>
              {/* Native Hidden File Input */}
              <input 
                type="file" 
                multiple 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
              />
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-500 text-white h-9 text-xs font-semibold px-5 shadow-sm rounded-lg"
              >
                + Upload File
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="overflow-hidden border shadow-sm bg-white flex-1">
        <div className="p-6 space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* --- FOLDERS SIDEBAR --- */}
            <div className="md:col-span-1 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-2">
                  File Explorer
                </span>
                {folders.map((fld) => {
                  const fldDocs = fld === "All Files" ? documents : documents.filter((d) => (d.folder || "Other") === fld)
                  const fldCount = fldDocs.length
                  const isActive = selectedFolder === fld

                  return (
                    <button
                      key={fld}
                      onClick={() => setSelectedFolder(fld)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isActive ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="truncate text-left">{fld === "All Files" ? "🗂️" : "📁"} {fld}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${isActive ? "bg-blue-700 text-blue-100" : "bg-slate-200 text-slate-500"}`}>
                        {fldCount}
                      </span>
                    </button>
                  )
                })}

                {/* Add Custom Folder */}
                {isAddingFolder ? (
                  <div className="flex flex-col gap-2 mt-2 px-1 py-1">
                    <Input
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="New folder name..."
                      className="h-8 text-xs bg-white border-slate-300"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddFolder()
                        if (e.key === "Escape") {
                          setIsAddingFolder(false)
                          setNewFolderName("")
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={handleAddFolder} className="flex-1 h-7 text-[10px] bg-blue-600 hover:bg-blue-500 text-white">Save</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => { setIsAddingFolder(false); setNewFolderName(""); }} className="h-7 px-3 text-[10px] text-slate-500 hover:bg-slate-200">Cancel</Button>
                    </div>
                  </div>
                ) : (
                  !isReadOnly && (
                    <div className="pt-2 px-1">
                      <button type="button" onClick={() => setIsAddingFolder(true)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-dashed border-slate-300">
                        + New Folder
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* --- FILE LIST MANAGER --- */}
            <div className="md:col-span-3 space-y-4">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex gap-2">
                <Input
                  placeholder="Search file names..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 text-xs bg-slate-50 w-full border-slate-200 focus:bg-white"
                />
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                {/* Table Header */}
                <div className="hidden sm:grid grid-cols-12 gap-4 p-3 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <div className="col-span-6 pl-2">File Name</div>
                  <div className="col-span-2">Folder</div>
                  <div className="col-span-2 text-right">Size</div>
                  <div className="col-span-2 text-right pr-2">Actions</div>
                </div>

                <div className="divide-y divide-slate-100">
                  {filteredDocs.map((doc) => (
                    <div 
                      key={doc.id} 
                      className="flex flex-col sm:grid sm:grid-cols-12 gap-4 p-3 sm:items-center hover:bg-slate-50 transition-colors"
                    >
                      <div className="sm:col-span-6 flex items-center gap-3 overflow-hidden pl-2">
                        <span className="text-xl shrink-0 opacity-80">📄</span>
                        <div className="overflow-hidden">
                          <h3 className="font-semibold text-slate-900 text-sm truncate">{doc.name}</h3>
                          <p className="text-xs text-slate-500 sm:hidden mt-1 font-medium">
                            <span className="font-bold text-slate-700">{doc.folder}</span> • {formatBytes(doc.size)} • {doc.dateAdded}
                          </p>
                        </div>
                      </div>

                      <div className="hidden sm:flex sm:col-span-2 items-center">
                        <Badge variant="outline" className="text-xs font-bold text-slate-700 bg-slate-100 border-slate-300 truncate px-2 py-0.5">
                          {doc.folder}
                        </Badge>
                      </div>

                      <div className="hidden sm:flex sm:col-span-2 flex-col items-end justify-center">
                        <span className="text-xs font-semibold text-slate-600">{formatBytes(doc.size)}</span>
                        <span className="text-[10px] text-slate-400">{doc.dateAdded}</span>
                      </div>

                      <div className="sm:col-span-2 flex items-center justify-center sm:justify-end pr-2 gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleOpenFile(doc)} 
                          className="w-full sm:w-auto h-8 px-3 bg-white border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-[11px] rounded-md shadow-sm"
                        >
                          Open
                        </Button>
                        {!isReadOnly && (
                          <Button 
                            size="sm" 
                            onClick={() => handleOpenEdit(doc)} 
                            className="w-full sm:w-auto h-8 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] rounded-md shadow-sm"
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {filteredDocs.length === 0 && (
                    <div className="py-16 text-center bg-white">
                      <div className="text-4xl mb-4 opacity-50">🗂️</div>
                      <p className="text-slate-500 text-sm font-medium">No files found in this folder.</p>
                      <p className="text-slate-400 text-xs mt-1">Upload a file to get started.</p>
                      {!isReadOnly && (
                        <Button 
                          size="sm" 
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs h-9 px-4 shadow-sm"
                        >
                          + Upload File
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </Card>

      {/* Edit/Move File Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[400px] border-2 border-slate-900 rounded-xl [&>button]:text-slate-400 hover:[&>button]:text-white p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-6 py-5 bg-slate-900 border-b border-slate-800 shrink-0">
            <DialogTitle className="text-orange-400 font-bold">
              Manage File
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 px-6 py-4 bg-white">
            <div>
              <Label htmlFor="doc-name" className="text-xs font-semibold text-slate-700">File Name</Label>
              <Input 
                id="doc-name" 
                value={formName} 
                onChange={(e) => setFormName(e.target.value)} 
                className="mt-1 h-9 text-sm shadow-sm"
              />
            </div>

            <div>
              <Label htmlFor="doc-folder" className="text-xs font-semibold text-slate-700">Move to Folder</Label>
              <select
                id="doc-folder"
                value={formFolder}
                onChange={(e) => setFormFolder(e.target.value)}
                className="mt-1 w-full h-9 border border-slate-200 shadow-sm rounded-md px-3 text-sm bg-white appearance-none"
              >
                {folders.filter((f) => f !== "All Files").map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2 p-6 pt-4 border-t border-slate-100 bg-white items-center shrink-0">
            <div className="flex gap-2 w-full">
              <Button 
                size="sm"
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm h-9" 
                onClick={handleSaveDoc}
              >
                Save Changes
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

            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleDeleteDoc} 
              className="w-full shadow-sm bg-rose-600 hover:bg-rose-500 text-white font-bold h-9"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}