"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  { label: "Dashboard", href: "/", icon: "📊" },
  { label: "Schedule & Tasks", href: "/schedule", icon: "📅" },
  { label: "Daily Logs & Photos", href: "/logs", icon: "📷" },
  { label: "Expenses", href: "/expenses", icon: "💰" },
  { label: "Selections", href: "/selections", icon: "🛍️" },
  { label: "Contacts & Vendors", href: "/contacts", icon: "📞" },
  { label: "Templates", href: "/templates", icon: "📋" },
  { label: "Tips & Tricks", href: "/tips", icon: "💡" },
  { label: "Logo Showcase", href: "/logo-preview", icon: "🎨" }, // Temporary Preview Tab
]

export default function SidebarNav() {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      {/* Brand Header (Logo Removed) */}
      <div className="px-3 py-2 flex items-center gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-white leading-none">
            Job<span className="text-blue-400">Flow</span>
          </h1>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="space-y-1 text-sm font-medium">
        {navItems.map((item) => {
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                isActive
                  ? "bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/30 shadow-xs"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}