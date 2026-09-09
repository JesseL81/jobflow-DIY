"use client"

import { useState } from "react"
import { useOfflineSync } from "@/hooks/useOfflineSync"
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
  DialogFooter,
} from "@/components/ui/dialog"

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
    notes: "Keep track of all your subcontractors, vendors, and inspectors here. Click '+ Add New Contact' to get started!",
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

export default function ContactsPage() {
  // Universal Sync Hook
  const [contacts, setContacts] = useOfflineSync<Contact[]>("cleanbuild_contacts", INITIAL_CONTACTS)
  
  const [activeContactId, setActiveContactId] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  
  // Controlled Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form State
  const [newName, setNewName] = useState("")
  const [newCompany, setNewCompany] = useState("")
  const [newTrade, setNewTrade] = useState("General Subcontractor")
  const [newPhone, setNewPhone] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newAddress, setNewAddress] = useState("")
  const [newNotes, setNewNotes] = useState("")
  const [newStatus, setNewStatus] = useState<"Active" | "Preferred" | "On Hold">("Active")

  const filteredContacts = contacts.filter((c) => {
    const term = searchTerm.toLowerCase()
    return (
      c.name.toLowerCase().includes(term) ||
      c.company.toLowerCase().includes(term) ||
      c.trade.toLowerCase().includes(term)
    )
  })

  // Automatically select the first contact if none is active
  const activeContact = filteredContacts.find((c) => c.id === activeContactId) || filteredContacts[0] || null

  const handleOpenAddModal = () => {
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
    const isConfirmed = window.confirm("Are you sure you want to remove this contact from your directory? This cannot be undone.")
    if (!isConfirmed) return

    const updatedContacts = contacts.filter((c) => c.id !== id)
    await setContacts(updatedContacts)
    
    if (activeContactId === id) {
      setActiveContactId("")
    }
  }

  const handleSaveContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!newName || !newCompany || isSubmitting) return

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
      
      // Auto-syncs to IndexedDB and Supabase
      await setContacts(updatedContacts)
      
      setActiveContactId(contactData.id)
      setIsModalOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="p-6 bg-slate-100 min-h-screen space-y-6 flex flex-col text-slate-950">
      
      <div className="bg-slate-900 text-white p-6 md:px-8 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:h-[140px] shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">📞 Contacts & Vendors</h1>
          </div>
          <p className="text-sm font-medium text-orange-400 mt-1.5 leading-relaxed max-w-2xl">
            Select a contact on the left to view complete details.
          </p>
        </div>

        <div className="flex items-center justify-center w-full md:w-auto gap-2 shrink-0">
          <Button 
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-400 text-white h-10 text-xs font-semibold px-4 shadow-sm transition-colors focus:outline-none"
          >
            + Add New Contact
          </Button>
          
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="sm:max-w-[520px] bg-white text-slate-900 border-2 border-slate-900 rounded-xl [&>button]:text-slate-400 hover:[&>button]:text-white">
              <form onSubmit={handleSaveContact}>
                <DialogHeader className="-mx-6 -mt-6 px-6 py-5 bg-slate-900 rounded-t-[10px] border-b border-slate-800 mb-2">
                  <DialogTitle className="text-lg font-bold text-orange-400">
                    {editingId ? "Edit Contact" : "Add New Contact / Vendor"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-300 mt-1">
                    {editingId 
                      ? "Update the details for this vendor below." 
                      : "Fill in vendor and trade details to save them to your active directory."}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="font-semibold text-slate-700">Contact Person Name *</Label>
                      <Input
                        id="name"
                        placeholder="e.g. Dave Miller"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="bg-white border-slate-200 text-xs h-9"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="company" className="font-semibold text-slate-700">Business / Company Name *</Label>
                      <Input
                        id="company"
                        placeholder="e.g. Apex Electrical"
                        value={newCompany}
                        onChange={(e) => setNewCompany(e.target.value)}
                        className="bg-white border-slate-200 text-xs h-9"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="trade" className="font-semibold text-slate-700">Trade / Specialty</Label>
                      <select
                        id="trade"
                        value={newTrade}
                        onChange={(e) => setNewTrade(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
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
                      <Label htmlFor="status" className="font-semibold text-slate-700">Status</Label>
                      <select
                        id="status"
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value as "Active" | "Preferred" | "On Hold")}
                        className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                      >
                        <option value="Active">Active</option>
                        <option value="Preferred">Preferred</option>
                        <option value="On Hold">On Hold</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="font-semibold text-slate-700">Phone Number</Label>
                      <Input
                        id="phone"
                        placeholder="(555) 000-0000"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        className="bg-white border-slate-200 text-xs h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="font-semibold text-slate-700">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="contact@company.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="bg-white border-slate-200 text-xs h-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="address" className="font-semibold text-slate-700">Office / Shop Address</Label>
                    <Input
                      id="address"
                      placeholder="123 Main St, Suite 100, City, ST"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      className="bg-white border-slate-200 text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="notes" className="font-semibold text-slate-700">Notes & Trade Details</Label>
                    <textarea
                      id="notes"
                      placeholder="Rates, lead times, licensing info, or scheduling requirements..."
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4 mt-2 border-t border-slate-100">
  <Button 
    type="submit"
    size="sm"
    disabled={isSubmitting}
    className="flex-1 bg-blue-600 hover:bg-blue-400 text-white font-semibold shadow-sm" 
  >
    {isSubmitting ? "Saving..." : editingId ? "Update Contact" : "Save Contact"}
  </Button>
  
  <Button 
    type="button"
    variant="outline" 
    size="sm"
    onClick={() => setIsModalOpen(false)} 
    className="flex-1 shadow-sm font-semibold text-slate-700"
  >
    Cancel
  </Button>
</div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start flex-1">
        
        {/* Left Side: Directory List */}
        <div className="md:col-span-4 space-y-3">
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

        {/* Right Side: Active Contact Details */}
        <div className="md:col-span-8">
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
                
                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button 
                    size="sm" 
                    onClick={() => handleOpenEditModal(activeContact)}
                    className="h-6 px-3 bg-blue-600 hover:bg-blue-400 text-white font-bold text-[10px] tracking-wide rounded-md shadow-sm uppercase shrink-0"
                  >
                    EDIT
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDeleteContact(activeContact.id)}
                    className="h-6 px-3 text-[10px] uppercase font-bold text-rose-600 hover:bg-rose-50"
                  >
                    DELETE
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

      
    </main>
  )
}