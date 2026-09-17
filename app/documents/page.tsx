"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useOfflineSync } from "@/hooks/useOfflineSync"
import { get, set, del } from "idb-keyval"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { PaywallOverlay } from "@/components/paywall-overlay"

import JSZip from "jszip"
import { saveAs } from "file-saver"

export interface DocumentItem {
  id: string
  name: string
  folder: string
  size: number
  dateAdded: string
  fileData?: string // Legacy base64 support
  filePath?: string // Supabase cloud storage path
  isPendingUpload?: boolean // Offline-first sync flag
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

function formatBytes(bytes: number, decimals = 1) {
  if (!+bytes) return "0 Bytes"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export default function DocumentsPage() {
  const [isMounted, setIsMounted] = useState(false)
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

  // Deleting Folder State
  const [isFolderDeleteModalOpen, setIsFolderDeleteModalOpen] = useState(false)
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null)
  const [folderDeleteMode, setFolderDeleteMode] = useState<"move" | "delete">("move")
  const [folderMoveTarget, setFolderMoveTarget] = useState<string>("Plans & Permits")

  // Drag & Drop / Upload State
  const [isDragging, setIsDragging] = useState(false)
  const [uploadTargetFolder, setUploadTargetFolder] = useState<string>("All Files")

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
    setIsMounted(true)
  }, [])

  // Self-Healing Logic for "All Files"
  useEffect(() => {
    if (isMounted && folders) {
      let needsUpdate = false
      let newFolders = [...folders]

      if (!newFolders.includes("All Files")) {
        newFolders.unshift("All Files")
        needsUpdate = true
      }

      if (newFolders.indexOf("All Files") !== 0) {
        newFolders = newFolders.filter(c => c !== "All Files")
        newFolders.unshift("All Files")
        needsUpdate = true
      }

      if (needsUpdate) {
        setFolders(newFolders)
        if (selectedFolder === "All Files") {
          setSelectedFolder("All Files")
        }
      }
    }
  }, [isMounted, folders, selectedFolder, setFolders])

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

  // 🔥 OFFLINE-FIRST BACKGROUND SYNC ENGINE
  // This watches for files marked as "Pending Sync" and uploads them the second you get internet.
  useEffect(() => {
    const syncPendingFiles = async () => {
      if (!navigator.onLine || isReadOnly) return
      
      const pendingDocs = documents.filter(d => d.isPendingUpload)
      if (pendingDocs.length === 0) return

      let updated = false
      const updatedDocs = [...documents]

      for (const doc of pendingDocs) {
        try {
          const localFile = await get<File | Blob>(`cleanbuild_file_${doc.id}`)
          if (localFile) {
            const fileExt = doc.name.split('.').pop()
            const cloudFileName = `${doc.id}.${fileExt}`
            
            // Upload to Supabase 'documents' bucket
            const { data, error } = await supabase.storage
              .from('documents')
              .upload(cloudFileName, localFile, { upsert: true })

            if (!error && data) {
              const docIndex = updatedDocs.findIndex(d => d.id === doc.id)
              if (docIndex !== -1) {
                updatedDocs[docIndex] = { 
                  ...updatedDocs[docIndex], 
                  filePath: data.path, 
                  isPendingUpload: false 
                }
                updated = true
              }
            }
          }
        } catch (e) {
          console.error("Background sync failed for document:", doc.name, e)
        }
      }

      if (updated) {
        setDocuments(updatedDocs)
      }
    }

    // Attempt sync on mount, and anytime the browser fires an 'online' event
    syncPendingFiles()
    window.addEventListener('online', syncPendingFiles)
    return () => window.removeEventListener('online', syncPendingFiles)
  }, [documents, setDocuments, isReadOnly])

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
    
    setIsAddingFolder(false)
    setNewFolderName("")
    setSelectedFolder(trimmed)
    
    if (!folders.includes(trimmed)) {
      setFolders([...folders, trimmed])
    }
  }

  const handleOpenDeleteFolder = (folder: string) => {
    setFolderToDelete(folder)
    const availableFallbacks = folders.filter(f => f !== "All Files" && f !== folder)
    setFolderMoveTarget(availableFallbacks.includes("Plans & Permits") ? "Plans & Permits" : availableFallbacks[0] || "")
    setFolderDeleteMode("move")
    setIsFolderDeleteModalOpen(true)
  }

  const handleConfirmFolderDelete = async () => {
    if (isReadOnly || !folderToDelete) return

    const targetFolder = folderToDelete
    setIsFolderDeleteModalOpen(false)

    let updatedDocs = [...documents]
    const itemsInFolder = updatedDocs.filter(d => (d.folder || "Other") === targetFolder)

    if (itemsInFolder.length > 0) {
      if (folderDeleteMode === "delete") {
        const idsToDelete = new Set(itemsInFolder.map(i => i.id))
        
        // Remove from cloud if synced
        const docsToDeleteFromCloud = itemsInFolder.filter(d => d.filePath).map(d => d.filePath!)
        if (docsToDeleteFromCloud.length > 0 && navigator.onLine) {
          supabase.storage.from('documents').remove(docsToDeleteFromCloud)
        }

        updatedDocs = updatedDocs.filter(doc => !idsToDelete.has(doc.id))
        
        // Remove from local storage
        for (const id of idsToDelete) {
          await del(`cleanbuild_file_${id}`)
        }
      } else if (folderDeleteMode === "move" && folderMoveTarget) {
        updatedDocs = updatedDocs.map(doc => 
          (doc.folder || "Other") === targetFolder ? { ...doc, folder: folderMoveTarget } : doc
        )
      }
    }
    
    setDocuments(updatedDocs)
    setFolders(folders.filter(f => f !== targetFolder))
    
    if (selectedFolder === targetFolder) setSelectedFolder("All Files")
    
    setTimeout(() => {
      setFolderToDelete(null)
    }, 300)
  }

  // 🔥 CORE FILE PROCESSING LOGIC (Handles both Input buttons and Drag & Drop)
  const processFiles = async (files: File[]) => {
    const newDocs: DocumentItem[] = []
    const targetFolder = uploadTargetFolder !== "All Files" ? uploadTargetFolder : "Plans & Permits"

    for (const file of files) {
      try {
        const newId = Date.now().toString() + Math.random().toString(36).substring(7)
        
        // 1. ALWAYS save locally first to ensure instant, offline availability
        await set(`cleanbuild_file_${newId}`, file)

        let filePath = ""
        let isPendingUpload = true

        // 2. Try to upload to Supabase immediately if online
        if (navigator.onLine) {
           const fileExt = file.name.split('.').pop()
           const cloudFileName = `${newId}.${fileExt}`
           
           const { data, error } = await supabase.storage
             .from('documents')
             .upload(cloudFileName, file)
           
           if (!error && data) {
             filePath = data.path
             isPendingUpload = false // Success! No background sync needed.
           }
        }

        newDocs.push({
          id: newId,
          name: file.name,
          folder: targetFolder,
          size: file.size,
          dateAdded: new Date().toISOString().split("T")[0],
          filePath,
          isPendingUpload
        })
      } catch (err) {
        console.error("Error processing file", err)
        alert(`Failed to process ${file.name}.`)
      }
    }

    setDocuments([...newDocs, ...documents])
    if (fileInputRef.current) fileInputRef.current.value = ""
    setUploadTargetFolder(selectedFolder)
  }

  // --- HTML Input Upload Handler ---
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly || !e.target.files?.length) return
    await processFiles(Array.from(e.target.files))
  }

  // --- Drag and Drop Handlers ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (isReadOnly) return
    if (!isDragging) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (isReadOnly || !e.dataTransfer.files?.length) return
    
    // Set target folder based on what is currently active in the UI
    setUploadTargetFolder(selectedFolder)
    await processFiles(Array.from(e.dataTransfer.files))
  }

  // --- SMART FILE OPENER ---
  const handleOpenFile = async (doc: DocumentItem) => {
    try {
      // 1. Check local offline storage first (instant load)
      const localFile = await get<File | Blob>(`cleanbuild_file_${doc.id}`)
      if (localFile) {
        const url = URL.createObjectURL(localFile)
        window.open(url, '_blank')
        return
      }

      // 2. If it's not on this device, fetch a secure URL from the Cloud
      if (doc.filePath) {
        const { data, error } = await supabase.storage.from('documents').createSignedUrl(doc.filePath, 60)
        if (error || !data) throw error
        window.open(data.signedUrl, '_blank')
        return
      }

      // 3. Fallback for legacy dummy items
      if (doc.fileData) {
        const parts = doc.fileData.split(',')
        const mimeString = parts[0].split(':')[1].split(';')[0]
        const byteString = atob(parts[1])
        const ab = new ArrayBuffer(byteString.length)
        const ia = new Uint8Array(ab)
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i)
        const blob = new Blob([ab], { type: mimeString })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
        return
      }

      alert("File is not cached locally and no cloud sync was found.")
    } catch (err) {
      console.error("Failed to open file", err)
      alert("Unable to open this file. Check your internet connection if the file is not downloaded.")
    }
  }

  const handleExportAll = async () => {
    if (!documents || documents.length === 0) return
    setIsExporting(true)
    
    try {
      const zip = new JSZip()
      const safeProjectName = projectName.replace(/[^a-z0-9]/gi, '_') || "CleanBuild_Project"
      const projectFolder = zip.folder(safeProjectName)
      
      if (!projectFolder) throw new Error("Could not create zip folder")
      
      for (const doc of documents) {
        let fileBlob: Blob | null = (await get<File | Blob>(`cleanbuild_file_${doc.id}`)) || null
        
        // If not stored locally, download from Cloud to zip it
        if (!fileBlob && doc.filePath) {
          const { data, error } = await supabase.storage.from('documents').download(doc.filePath)
          if (!error && data) fileBlob = data
        }

        if (fileBlob) {
          projectFolder.folder(doc.folder || "Other")?.file(doc.name, fileBlob)
        } else if (doc.fileData) {
           const base64Data = doc.fileData.split(',')[1]
           if (base64Data) {
              projectFolder.folder(doc.folder || "Other")?.file(doc.name, base64Data, { base64: true })
           }
        }
      }
      
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
    setIsModalOpen(false)

    const updatedDoc: DocumentItem = {
      ...editingDoc,
      name: formName.trim(),
      folder: formFolder,
    }
    
    const updatedList = documents.map((d) => (d.id === editingDoc.id ? updatedDoc : d))
    setDocuments(updatedList)
  }

  const handleDeleteDoc = async () => {
    if (isReadOnly || !editingDoc) return
    setIsModalOpen(false)
    
    // 1. Remove from local state
    const updatedList = documents.filter((d) => d.id !== editingDoc.id)
    setDocuments(updatedList)

    // 2. Remove from Local Storage
    await del(`cleanbuild_file_${editingDoc.id}`)

    // 3. Remove from Cloud Storage
    if (editingDoc.filePath && navigator.onLine) {
      await supabase.storage.from('documents').remove([editingDoc.filePath])
    }
  }

  if (!isMounted) return null

  return (
    <main 
      className={`p-6 bg-slate-100 flex flex-col text-slate-950 relative ${showPaywall ? 'h-screen overflow-hidden' : 'min-h-screen space-y-6'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <PaywallOverlay show={showPaywall} />

      {/* 🔥 DRAG AND DROP OVERLAY */}
      {isDragging && !isReadOnly && (
        <div className="absolute inset-0 z-50 bg-blue-600/10 border-4 border-blue-600 border-dashed m-6 rounded-xl flex items-center justify-center backdrop-blur-sm transition-all pointer-events-none">
          <div className="bg-white px-8 py-6 rounded-2xl shadow-2xl text-center flex flex-col items-center">
            <span className="text-5xl mb-3 block animate-bounce">📥</span>
            <h2 className="text-2xl font-bold text-slate-900">Drop files to upload</h2>
            <p className="text-sm text-slate-500 mt-2 font-medium">
              Uploading to: <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded ml-1 font-bold">{selectedFolder !== "All Files" ? selectedFolder : "Plans & Permits"}</span>
            </p>
          </div>
        </div>
      )}

      <div className="bg-slate-900 text-white p-6 md:px-8 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:h-[140px] shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            📁 Documents & Files {isReadOnly && <span className="text-sm bg-slate-700 px-2 py-1 rounded-md text-slate-300 font-semibold ml-2">Read-Only</span>}
          </h1>
          <p className="text-sm font-medium text-orange-400 mt-1.5 leading-relaxed max-w-2xl">
            {isReadOnly ? "View project files and plans." : "Drag, drop, and manage project files. Syncs seamlessly offline and to the cloud."}
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
              <input 
                type="file" 
                multiple 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
              />
              <Button
                size="sm"
                onClick={() => {
                  setUploadTargetFolder(selectedFolder)
                  fileInputRef.current?.click()
                }}
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
                
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider px-2 block mb-2">
                  Filter by Folder
                </span>
                
                {folders.map((fld) => {
                  const fldDocs = fld === "All Files" ? documents : documents.filter((d) => (d.folder || "Other") === fld)
                  const fldCount = fldDocs.length
                  const isActive = selectedFolder === fld
                  const isProtectedFolder = fld === "All Files" || fld === "Plans & Permits"

                  return (
                    <div 
                      key={fld} 
                      className={`w-full flex items-center justify-between rounded-lg transition-all group ${
                        isActive ? "bg-slate-900 text-white shadow-sm" : "hover:bg-slate-200"
                      }`}
                    >
                      <button
                        onClick={() => setSelectedFolder(fld)}
                        className={`flex-1 flex items-center justify-between px-3 py-2 text-xs font-semibold text-left truncate ${
                          isActive ? "text-white" : "text-slate-600"
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="truncate text-left">{fld}</span>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                          isActive ? "bg-slate-700 text-slate-200" : "bg-slate-200 text-slate-500"
                        }`}>
                          {fldCount}
                        </span>
                      </button>

                      {/* 🔥 FOLDER ACTIONS GROUP */}
                      {!isReadOnly && fld !== "All Files" && (
                        <div className="flex items-center gap-0.5 pr-1.5 shrink-0">
                          {/* Quick Add Plus */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadTargetFolder(fld);
                              fileInputRef.current?.click();
                            }}
                            className={`h-6 w-6 rounded flex items-center justify-center font-bold text-lg leading-none transition-colors ${
                              isActive 
                                ? "text-orange-400 hover:bg-slate-700 hover:text-orange-300" 
                                : "text-orange-500 hover:bg-orange-100 hover:text-orange-600"
                            }`}
                            title={`Upload to ${fld}`}
                          >
                            +
                          </button>

                          {/* Trash Can or Spacer */}
                          {isProtectedFolder ? (
                            <div className="h-6 w-6 shrink-0" />
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenDeleteFolder(fld)
                              }}
                              className={`h-6 w-6 rounded flex items-center justify-center transition-colors ${
                                isActive 
                                  ? "text-slate-400 hover:bg-rose-500 hover:text-white" 
                                  : "text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-rose-100 hover:text-rose-600"
                              }`}
                              title={`Delete ${fld}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

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
                      className="flex flex-col sm:grid sm:grid-cols-12 gap-4 p-3 sm:items-center hover:bg-slate-50 transition-colors group"
                    >
                      <div className="sm:col-span-6 flex items-center gap-3 overflow-hidden pl-2">
                        <span className="text-xl shrink-0 opacity-80">📄</span>
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900 text-sm truncate">{doc.name}</h3>
                            {/* 🔥 Cloud Sync Status Indicator */}
                            {doc.isPendingUpload ? (
                              <span title="Pending Cloud Sync" className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold shrink-0 animate-pulse">
                                ⏳ Syncing
                              </span>
                            ) : (
                              <span title="Saved to Cloud" className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                ☁️ Cloud
                              </span>
                            )}
                          </div>
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
                      <p className="text-slate-400 text-xs mt-1">Drag and drop a file anywhere on screen to upload.</p>
                      {!isReadOnly && (
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setUploadTargetFolder(selectedFolder)
                            fileInputRef.current?.click()
                          }}
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

      {/* Delete Folder Modal */}
      <Dialog open={isFolderDeleteModalOpen} onOpenChange={setIsFolderDeleteModalOpen}>
        <DialogContent className="sm:max-w-[440px] bg-white text-slate-900 border-2 border-slate-900 rounded-xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 bg-slate-900 border-b border-slate-800 shrink-0">
            <DialogTitle className="text-lg font-bold text-rose-500">
              Delete Folder
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300 mt-1">
              You are about to delete <strong className="text-white">"{folderToDelete}"</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5 bg-white space-y-4">
            {(() => {
              const itemsInFolder = documents.filter(d => (d.folder || "Other") === folderToDelete).length;
              
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
                    There are <strong>{itemsInFolder} document(s)</strong> stored in this folder. What would you like to do with them?
                  </p>
                  
                  <div className="grid gap-3">
                    <label className={`flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-colors ${folderDeleteMode === 'move' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-white hover:border-blue-200'}`}>
                      <div className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          name="folder_delete_mode" 
                          checked={folderDeleteMode === 'move'} 
                          onChange={() => setFolderDeleteMode('move')}
                          className="h-4 w-4 accent-blue-600"
                        />
                        <span className="text-sm font-bold text-slate-900">Keep files and move them to:</span>
                      </div>
                      
                      {folderDeleteMode === 'move' && (
                        <div className="pl-6 pt-2">
                          <select
                            value={folderMoveTarget}
                            onChange={(e) => setFolderMoveTarget(e.target.value)}
                            className="w-full h-9 rounded-md border border-slate-300 px-3 py-1 text-sm bg-white shadow-sm"
                          >
                            {folders.filter(f => f !== "All Files" && f !== folderToDelete).map(f => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </label>

                    <label className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${folderDeleteMode === 'delete' ? 'border-rose-500 bg-rose-50/50' : 'border-slate-200 bg-white hover:border-rose-200'}`}>
                      <input 
                        type="radio" 
                        name="folder_delete_mode" 
                        checked={folderDeleteMode === 'delete'} 
                        onChange={() => setFolderDeleteMode('delete')}
                        className="h-4 w-4 accent-rose-600"
                      />
                      <span className="text-sm font-bold text-slate-900">Permanently delete all {itemsInFolder} file(s)</span>
                    </label>
                  </div>
                </>
              )
            })()}
          </div>

          <div className="flex gap-2 p-6 pt-4 border-t border-slate-100 bg-white shrink-0">
            <Button 
              size="sm" 
              onClick={handleConfirmFolderDelete}
              className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-sm h-9" 
            >
              Confirm Delete
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsFolderDeleteModalOpen(false)} 
              className="flex-1 shadow-sm font-semibold text-slate-700 hover:bg-slate-100 h-9"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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