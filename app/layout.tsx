import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import SidebarNav from "@/components/sidebar-nav"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "JobFlow Pro",
  description: "Construction project management, daily logs, schedules, contacts, and expense tracking.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-slate-900 text-slate-100 flex min-h-screen`}
        suppressHydrationWarning
      >
        {/* Left Sidebar Navigation */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 shrink-0">
          <SidebarNav />

          <div className="px-3 py-2 text-xs text-slate-500 border-t border-slate-800">
            JobFlow Pro v1.0
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 bg-slate-100 text-slate-900 overflow-y-auto">
          {children}
        </div>
      </body>
    </html>
  )
}