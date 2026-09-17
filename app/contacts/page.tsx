"use client"

import { useState, useEffect } from "react"
import { useOfflineSync } from "@/hooks/useOfflineSync"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { PaywallOverlay } from "@/components/paywall-overlay"
import { PageTour } from "@/components/page-tour"

interface Contact {
  id: string
  name: string
  company: string
  trade: string
  phone: string
  email: string
  address: string
  notes: string
  status: "Active" | "Preferred" | "On Hold"
}

const INITIAL_CONTACTS: Contact[] = [
  {
    id: "c-1",
    name: "👋 Welcome to Contacts!",
    company: "CleanBuild Tutorial",
    trade: "General Subcontractor",
    phone: "(555) 000-0000",
    email: "hello@cleanbuild.us",
    address: "123 Tutorial Lane",
    notes: "Keep track of all your subcontractors, vendors, and inspectors here. Click '+ Add Contact' to get started!",
    status: "Active",
  },
  {
    id: "c-2",
    name: "Dave Miller",
    company: "Apex Electrical Services",
    trade: "Electrician",
    phone: "(555) 234-5678",
    email: "dave@apexelectrical.com",
    address: "104 Industrial Pkwy, Suite B",
    notes: "Requires 3-day notice for rough-in work. Excellent quality and licensed master electrician.",
    status: "Preferred",
  }
]

// 🔥 Define the Tour Steps for Contacts
const CONTACTS_TOUR_STEPS = [
  {
    target: ".tour-contacts-header",
    content: "Welcome to Contacts & Vendors! Store all your subcontractors, suppliers, and inspectors here.",
  },
  {
    target: ".tour-contacts-list",
    content: "Search and quickly select contacts from your directory. The list filters instantly as you type.",
  },
  {
    target: ".tour-contacts-details",
    content: "View contact details, directly click to call or email them, and securely store notes on pricing and lead times.",
  }
]

export default function ContactsPage() {
  const [isMounted, setIsMounted] = useState(false)
  const [contacts, setContacts] = useOfflineSync<Contact[]>("cleanbuild_contacts", INITIAL_CONTACTS)
  
  const [activeContactId, setActiveContactId] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [isOptionsOpen, setIsOptionsOpen] = useState(false)

  const [newName, setNewName] = useState("")
  const [newCompany, setNewCompany] = useState("")
  const [newTrade, setNewTrade] = useState("General Subcontractor")
  const [newPhone, setNewPhone] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newAddress, setNewAddress] = useState("")
  const [newNotes, setNewNotes] = useState("")
  const [newStatus, setNewStatus] = useState<"Active" | "Preferred" | "On Hold">("Active")

  const [currentUserEmail, setCurrentUserEmail] = useState<string>("")
  const [isGuest, setIsGuest] = useState(false)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [permissions, setPermissions] = useState<Record<string, string> | null>(null)
  const [accountTier, setAccountTier] = useState<string>("free")
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    setIsMounted(true)
  }, [])

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
              setPermissions(guestInvite.permissions)
              if (guestInvite.permissions.contacts === "read-only") {
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

  const filteredContacts = contacts.filter((c) => {
    const term = searchTerm.toLowerCase()
    return (
      c.name.toLowerCase().includes(term) ||
      c.company.toLowerCase().includes(term) ||
      c.trade.toLowerCase().includes(term)
    )
  })

  const activeContact = filteredContacts.find((c) => c.id === activeContactId) || filteredContacts[0] || null

  const handleOpenAddModal = () => {
    if (isReadOnly) return
    setEditingId(null)
    setNewName("")
    setNewCompany("")
    setNewTrade("General Subcontractor")
    setNewPhone("")
    setNewEmail("")
    setNewAddress("")
    setNewNotes("")
    setNewStatus("Active")
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (contact: Contact) => {
    setEditingId(contact.id)
    setNewName(contact.name)
    setNewCompany(contact.company)
    setNewTrade(contact.trade)
    setNewPhone(contact.phone)
    setNewEmail(contact.email)
    setNewAddress(contact.address)
    setNewNotes(contact.notes)
    setNewStatus(contact.status)
    setIsModalOpen(true)
  }

  const handleDeleteContact = async (id: string) => {
    if (isReadOnly) return
    const isConfirmed = window.confirm("Are you sure you want to remove this contact from your directory? This cannot be undone.")
    if (!isConfirmed) return

    const updatedContacts = contacts.filter((c) => c.id !== id)
    await setContacts(updatedContacts)
    
    if (activeContactId === id) {
      setActiveContactId("")
    }
    setIsModalOpen(false)
  }

  const handleSaveContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isReadOnly || !newName || !newCompany || isSubmitting) return

    setIsSubmitting(true)

    try {
      const contactData: Contact = {
        id: editingId || `c-${Date.now()}`,
        name: newName,
        company: newCompany,
        trade: newTrade || "General Subcontractor",
        phone: newPhone || "(555) 000-0000",
        email: newEmail || "contact@example.com",
        address: newAddress || "N/A",
        notes: newNotes || "No notes added.",
        status: newStatus,
      }

      let updatedContacts;
      if (editingId) {
        updatedContacts = contacts.map((c) => (c.id === editingId ? contactData : c))
      } else {
        updatedContacts = [contactData, ...contacts]
      }
      
      await setContacts(updatedContacts)
      
      setActiveContactId(contactData.id)
      setIsModalOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExportCSV = () => {
    const headers = ["Name", "Company", "Trade", "Phone", "Email", "Address", "Status", "Notes"]
    
    const rows = contacts.map((c) => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.company.replace(/"/g, '""')}"`,
      `"${c.trade.replace(/"/g, '""')}"`,
      `"${c.phone.replace(/"/g, '""')}"`,
      `"${c.email.replace(/"/g, '""')}"`,
      `"${c.address.replace(/"/g, '""')}"`,
      `"${c.status.replace(/"/g, '""')}"`,
      `"${c.notes.replace(/"/g, '""')}"`
    ])

    const brandingRow = `"CleanBuild - Contacts & Vendors Directory"\n\n`
    const csvContent = "data:text/csv;charset=utf-8," + brandingRow + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `CleanBuild_Contacts_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!isMounted) return null

  return (
    <main className={`p-6 bg-slate-100 flex flex-col text-slate-950 relative ${showPaywall ? 'h-screen overflow-hidden' : 'min-h-screen space-y-6'}`}>
      
      <PaywallOverlay show={showPaywall} />
      <PageTour steps={CONTACTS_TOUR_STEPS} tourKey="contacts_tour" />

      {/* Target: tour-contacts-header */}
      <div className="tour-contacts-header bg-slate-900 text-white p-6 md:px-8 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:min-h-[140px] shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              📞 Contacts & Vendors {isReadOnly && <span className="text-sm bg-slate-700 px-2 py-1 rounded-md text-slate-300 font-semibold ml-2">Read-Only</span>}
            </h1>
          </div>
          <p className="text-sm font-medium text-orange-400 mt-1.5 leading-relaxed max-w-2xl">
            {isReadOnly ? "View the directory details." : "Select a contact on the left to view complete details."}
          </p>
        </div>

        {/* Minimalist Action Layout */}
        <div className="flex items-center justify-end w-full md:w-auto gap-2 shrink-0 mt-2 md:mt-0">
          
          {!isReadOnly && (
            <Button
              size="sm"
              onClick={handleOpenAddModal}
              className="tour-add-contact bg-blue-600 hover:bg-blue-500 text-white h-9 text-xs font-semibold px-4 shadow-sm"
            >
              + Add Contact
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
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                  
                  {contacts.length > 0 && (
                    <button
                      onClick={() => {
                        setIsOptionsOpen(false)
                        handleExportCSV()
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 transition-colors"
                    >
                      <span>📊</span> Export to CSV
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      setIsOptionsOpen(false)
                      window.dispatchEvent(new Event('restart-tour-contacts_tour'))
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

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start flex-1">
        
        {/* Target: tour-contacts-list (Left Side) */}
        <div className="tour-contacts-list md:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Directory ({filteredContacts.length})
            </h3>
          </div>

          <div className="relative">
            <Input
              type="text"
              placeholder="🔍 Search by name, company, trade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white text-xs h-9 border-slate-200 placeholder:text-slate-400"
            />
          </div>

          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
            {filteredContacts.length === 0 ? (
              <p className="text-xs text-slate-500 p-3 text-center bg-white rounded-lg border">
                No contacts match your search.
              </p>
            ) : (
              filteredContacts.map((contact) => {
                const isActive = activeContact && contact.id === activeContact.id

                return (
                  <button
                    key={contact.id}
                    onClick={() => setActiveContactId(contact.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between ${
                      isActive
                        ? "bg-slate-900 text-white border-slate-900 shadow-md font-semibold"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="text-sm font-bold truncate">{contact.name}</div>
                      <div className={`text-xs truncate ${isActive ? "text-slate-300" : "text-slate-500"}`}>
                        {contact.company}
                      </div>
                    </div>
                    <span className={`text-sm shrink-0 ${isActive ? "text-indigo-400 font-bold" : "text-slate-400"}`}>
                      →
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Target: tour-contacts-details (Right Side) */}
        <div className="tour-contacts-details md:col-span-8">
          {activeContact ? (
            <Card className="bg-white border rounded-xl p-6 shadow-sm min-h-[420px] space-y-6">
              <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant="secondary"
                      className="text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
                    >
                      {activeContact.trade}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        activeContact.status === "Preferred"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : activeContact.status === "On Hold"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {activeContact.status}
                    </Badge>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-950 leading-tight">
                    {activeContact.name}
                  </h2>
                  <p className="text-sm font-medium text-slate-600 mt-0.5">
                    {activeContact.company}
                  </p>
                </div>
                
                {/* 🔥 Edit Action Button Only */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button 
                    size="sm" 
                    onClick={() => handleOpenEditModal(activeContact)}
                    className={`h-8 px-4 text-[11px] text-white font-bold rounded-md shadow-sm shrink-0 ${isReadOnly ? "bg-slate-600 hover:bg-slate-500" : "bg-blue-600 hover:bg-blue-500"}`}
                  >
                    {isReadOnly ? "View" : "Edit"}
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Phone Number
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      <a href={`tel:${activeContact.phone}`} className="hover:text-indigo-600 transition-colors">
                        📞 {activeContact.phone}
                      </a>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Email Address
                    </div>
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      <a href={`mailto:${activeContact.email}`} className="hover:text-indigo-600 transition-colors">
                        ✉️ {activeContact.email}
                      </a>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                    Address / Office Location
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200 font-medium">
                    📍 {activeContact.address}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                    Notes & Trade Details
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-200 whitespace-pre-wrap">
                    {activeContact.notes}
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="bg-white border rounded-xl p-12 text-center text-slate-500 text-xs">
              Select or search for a contact on the left to view details.
            </Card>
          )}
        </div>
      </div>

      {/* Main Edit / Add Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[520px] bg-white text-slate-900 border-2 border-slate-900 rounded-xl p-0 gap-0 overflow-hidden flex flex-col [&>button]:text-slate-400 hover:[&>button]:text-white [&>button]:top-5 [&>button]:right-5 max-h-[90vh]">
          <form onSubmit={handleSaveContact} className="flex flex-col w-full h-full overflow-hidden">
            <DialogHeader className="px-6 py-5 bg-slate-900 border-b border-slate-800 shrink-0">
              <DialogTitle className="text-lg font-bold text-orange-400">
                {isReadOnly ? "View Contact" : editingId ? "Edit Contact" : "Add New Contact / Vendor"}
              </DialogTitle>
              {!isReadOnly && (
                <DialogDescription className="text-xs text-slate-300 mt-1">
                  {editingId 
                    ? "Update the details for this vendor below." 
                    : "Fill in vendor and trade details to save them to your active directory."}
                </DialogDescription>
              )}
            </DialogHeader>

            <div className="grid gap-4 px-6 py-4 bg-white flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold text-slate-700">Contact Person Name {isReadOnly ? "" : "*"}</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Dave Miller"
                    value={newName}
                    disabled={isReadOnly}
                    onChange={(e) => setNewName(e.target.value)}
                    className={`bg-white border-slate-200 text-sm h-9 shadow-sm ${isReadOnly ? "opacity-80 font-medium text-slate-900" : ""}`}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company" className="text-xs font-semibold text-slate-700">Business / Company Name {isReadOnly ? "" : "*"}</Label>
                  <Input
                    id="company"
                    placeholder="e.g. Apex Electrical"
                    value={newCompany}
                    disabled={isReadOnly}
                    onChange={(e) => setNewCompany(e.target.value)}
                    className={`bg-white border-slate-200 text-sm h-9 shadow-sm ${isReadOnly ? "opacity-80 font-medium text-slate-900" : ""}`}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="trade" className="text-xs font-semibold text-slate-700">Trade / Specialty</Label>
                  <select
                    id="trade"
                    value={newTrade}
                    disabled={isReadOnly}
                    onChange={(e) => setNewTrade(e.target.value)}
                    className={`flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 appearance-none ${isReadOnly ? "opacity-80 font-medium text-slate-900" : "text-slate-900"}`}
                  >
                    <option value="General Subcontractor">General Subcontractor</option>
                    <option value="Electrician">Electrician</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="HVAC">HVAC</option>
                    <option value="Framing & Carpentry">Framing & Carpentry</option>
                    <option value="Tile & Flooring">Tile & Flooring</option>
                    <option value="Drywall & Paint">Drywall & Paint</option>
                    <option value="Masonry & Concrete">Masonry & Concrete</option>
                    <option value="Roofing">Roofing</option>
                    <option value="Inspector / Permitting">Inspector / Permitting</option>
                    <option value="Material Supplier">Material Supplier</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="status" className="text-xs font-semibold text-slate-700">Status</Label>
                  <select
                    id="status"
                    value={newStatus}
                    disabled={isReadOnly}
                    onChange={(e) => setNewStatus(e.target.value as "Active" | "Preferred" | "On Hold")}
                    className={`flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 appearance-none ${isReadOnly ? "opacity-80 font-medium text-slate-900" : "text-slate-900"}`}
                  >
                    <option value="Active">Active</option>
                    <option value="Preferred">Preferred</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="(555) 000-0000"
                    value={newPhone}
                    disabled={isReadOnly}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className={`bg-white border-slate-200 text-sm h-9 shadow-sm ${isReadOnly ? "opacity-80 font-medium text-slate-900" : ""}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-700">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contact@company.com"
                    value={newEmail}
                    disabled={isReadOnly}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className={`bg-white border-slate-200 text-sm h-9 shadow-sm ${isReadOnly ? "opacity-80 font-medium text-slate-900" : ""}`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-xs font-semibold text-slate-700">Office / Shop Address</Label>
                <Input
                  id="address"
                  placeholder="123 Main St, Suite 100, City, ST"
                  value={newAddress}
                  disabled={isReadOnly}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className={`bg-white border-slate-200 text-sm h-9 shadow-sm ${isReadOnly ? "opacity-80 font-medium text-slate-900" : ""}`}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs font-semibold text-slate-700">Notes & Trade Details</Label>
                <textarea
                  id="notes"
                  placeholder="Rates, lead times, licensing info, or scheduling requirements..."
                  value={newNotes}
                  disabled={isReadOnly}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className={`flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isReadOnly ? "opacity-80 font-medium text-slate-900" : "text-slate-900 placeholder:text-slate-400"}`}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 p-6 pt-4 border-t border-slate-100 bg-white items-center shrink-0">
              {isReadOnly ? (
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsModalOpen(false)} 
                  className="w-full h-9 shadow-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Close View
                </Button>
              ) : (
                <>
                  <div className="flex gap-2 w-full">
                    <Button 
                      type="submit"
                      size="sm"
                      disabled={isSubmitting}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm h-9" 
                    >
                      {isSubmitting ? "Saving..." : editingId ? "Save Changes" : "Save Contact"}
                    </Button>
                    
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsModalOpen(false)} 
                      className="flex-1 h-9 shadow-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Cancel
                    </Button>
                  </div>

                  {/* 🔥 Red Delete Button moved safely to the bottom of the modal */}
                  {editingId && (
                    <Button 
                      type="button"
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDeleteContact(editingId)}
                      className="w-full shadow-sm bg-rose-600 hover:bg-rose-500 text-white font-bold h-9"
                    >
                      Delete
                    </Button>
                  )}
                </>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  )
}