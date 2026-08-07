"use client"

import { useState, useEffect } from "react"
import { get, set } from "idb-keyval"
import { syncManager } from "@/lib/syncManager"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
  DialogTrigger,
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
    name: "Dave Miller",
    company: "Apex Electrical Services",
    trade: "Electrician",
    phone: "(555) 234-5678",
    email: "dave@apexelectrical.com",
    address: "104 Industrial Pkwy, Suite B",
    notes: "Requires 3-day notice for rough-in work. Excellent quality and licensed master electrician.",
    status: "Preferred",
  },
  {
    id: "c-2",
    name: "Sarah Jenkins",
    company: "Blue Wave Plumbing",
    trade: "Plumbing",
    phone: "(555) 876-5432",
    email: "sjenkins@bluewaveplumbing.com",
    address: "410 Commerce St",
    notes: "Handles all underground plumbing, finish trim, and water heater installs. Reliable schedule adherence.",
    status: "Active",
  },
  {
    id: "c-3",
    name: "Marcus Vance",
    company: "Vance Structural Framing",
    trade: "Framing & Carpentry",
    phone: "(555) 345-6789",
    email: "marcus@vanceframing.com",
    address: "88 Timberline Rd",
    notes: "Great crew for heavy structural beam placements and complex roof trusses.",
    status: "Preferred",
  },
  {
    id: "c-4",
    name: "Elena Rostova",
    company: "Precision Tile & Stone",
    trade: "Tile & Flooring",
    phone: "(555) 901-2345",
    email: "elena@precisiontile.com",
    address: "312 Granite Ave",
    notes: "Specializes in custom curbless showers and large-format porcelain tile.",
    status: "Active",
  },
  {
    id: "c-5",
    name: "Tom Bradley",
    company: "City Building Department",
    trade: "Inspector / Permitting",
    phone: "(555) 432-1098",
    email: "tbradley@citygov.org",
    address: "1 City Hall Plaza, Room 204",
    notes: "Lead inspector for residential trade permits. Inspection requests must be submitted before 4 PM for next-day review.",
    status: "Active",
  },
]

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [activeContactId, setActiveContactId] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Form State for Adding New Contact
  const [newName, setNewName] = useState("")
  const [newCompany, setNewCompany] = useState("")
  const [newTrade, setNewTrade] = useState("General Subcontractor")
  const [newPhone, setNewPhone] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newAddress, setNewAddress] = useState("")
  const [newNotes, setNewNotes] = useState("")
  const [newStatus, setNewStatus] = useState<"Active" | "Preferred" | "On Hold">("Active")

  // --- LOCAL STORAGE & CLOUD SYNC: READ ON MOUNT ---
  useEffect(() => {
    async function loadData() {
      try {
        // 1. Instant Offline Load (from IndexedDB)
        const savedContacts = await get<Contact[]>("jobflow_contacts")
        if (savedContacts && Array.isArray(savedContacts) && savedContacts.length > 0) {
          setContacts(savedContacts)
          setActiveContactId(savedContacts[0].id)
        } else {
          setContacts(INITIAL_CONTACTS)
          setActiveContactId(INITIAL_CONTACTS[0].id)
        }

        setIsLoaded(true) // UI renders instantly

        // 2. Silent Cloud Pull
        const cloudContacts = await syncManager.pullFromCloud("jobflow_contacts")
        if (cloudContacts && Array.isArray(cloudContacts) && cloudContacts.length > 0) {
          setContacts(cloudContacts)
          // If the currently active contact ID isn't in the newly pulled list, reset to the first one
          if (!cloudContacts.find(c => c.id === activeContactId)) {
            setActiveContactId(cloudContacts[0].id)
          }
        }
      } catch (err) {
        console.error("Failed to load contacts:", err)
        setContacts(INITIAL_CONTACTS)
        setActiveContactId(INITIAL_CONTACTS[0].id)
        setIsLoaded(true)
      }
    }
    loadData()
  }, [activeContactId])

  // --- LOCAL STORAGE & CLOUD SYNC: SAVE ON CHANGE ---
  useEffect(() => {
    if (isLoaded) {
      const syncData = async () => {
        try {
          await set("jobflow_contacts", contacts)
          await syncManager.pushToCloud("jobflow_contacts", contacts)
        } catch (e) {
          console.error("Failed to sync contacts:", e)
        }
      }
      syncData()
    }
  }, [contacts, isLoaded])

  // Filter contacts by search query
  const filteredContacts = contacts.filter((c) => {
    const term = searchTerm.toLowerCase()
    return (
      c.name.toLowerCase().includes(term) ||
      c.company.toLowerCase().includes(term) ||
      c.trade.toLowerCase().includes(term)
    )
  })

  // Selected contact or fall back to first in filtered list
  const activeContact =
    filteredContacts.find((c) => c.id === activeContactId) || filteredContacts[0] || null

  const handleAddContact = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!newName || !newCompany) return

    const newContact: Contact = {
      id: `c-${Date.now()}`,
      name: newName,
      company: newCompany,
      trade: newTrade || "General Subcontractor",
      phone: newPhone || "(555) 000-0000",
      email: newEmail || "contact@example.com",
      address: newAddress || "N/A",
      notes: newNotes || "No notes added.",
      status: newStatus,
    }

    const updatedContacts = [newContact, ...contacts]
    setContacts(updatedContacts)
    setActiveContactId(newContact.id)

    // Reset Form
    setNewName("")
    setNewCompany("")
    setNewTrade("General Subcontractor")
    setNewPhone("")
    setNewEmail("")
    setNewAddress("")
    setNewNotes("")
    setNewStatus("Active")
    setIsDialogOpen(false)
  }

  return (
    <main className="p-6 bg-slate-100 min-h-screen space-y-6 flex flex-col text-slate-950">
      
      {/* LOCKED HEIGHT HEADER BUBBLE: Standardized to exactly md:h-[140px] */}
      <div className="bg-slate-900 text-white p-6 md:px-8 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:h-[140px]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">📞 Contacts & Vendors</h1>
          </div>
          <p className="text-sm font-medium text-orange-400 mt-1.5 leading-relaxed max-w-2xl">
            Select or hover over a contact on the left to view complete details.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Add Contact Modal */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 text-white h-10 text-xs font-semibold px-4 shadow-sm transition-colors focus:outline-none">
              + Add New Contact
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-[520px] bg-white text-slate-900 border border-slate-200">
              <form onSubmit={handleAddContact}>
                <DialogHeader className="pb-2 border-b border-slate-100">
                  <DialogTitle className="text-lg font-bold text-slate-900">
                    Add New Contact / Vendor
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Fill in vendor and trade details to save them to your active directory.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4 text-xs">
                  {/* Name & Company */}
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

                  {/* Trade Select & Status Select */}
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

                  {/* Phone & Email */}
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

                  {/* Office Address */}
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

                  {/* Notes & Details */}
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

                <DialogFooter className="pt-2 border-t border-slate-100">
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4">
                    Save Contact
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Two-Column Master-Detail Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start flex-1">
        
        {/* Left Side: Search + Scrollable Directory List (4 Columns) */}
        <div className="md:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Directory ({filteredContacts.length})
            </h3>
          </div>

          {/* Search Input Bar */}
          <div className="relative">
            <Input
              type="text"
              placeholder="🔍 Search by name, company, trade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white text-xs h-9 border-slate-200 placeholder:text-slate-400"
            />
          </div>

          {/* Scroll List: Contact Name Title followed by Business Name */}
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
                    onMouseEnter={() => setActiveContactId(contact.id)}
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

        {/* Right Side: Expanded Detail Card (8 Columns) */}
        <div className="md:col-span-8">
          {activeContact ? (
            <Card className="bg-white border rounded-xl p-6 shadow-sm min-h-[420px] space-y-6">
              <div className="pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between gap-3 mb-2">
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

              <div className="space-y-6">
                {/* Phone & Email Section */}
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

                {/* Office / Shop Address */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                    Address / Office Location
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200 font-medium">
                    📍 {activeContact.address}
                  </p>
                </div>

                {/* Notes & Details */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                    Notes & Trade Details
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-200">
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

      {/* Version Tracker Footer */}
      <div className="w-full text-center py-6 text-xs text-slate-500 border-t border-slate-200 mt-8">
        CleanBuild v1.03
      </div>
      
    </main>
  )
}