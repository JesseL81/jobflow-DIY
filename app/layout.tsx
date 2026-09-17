import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import ClientLayout from "@/components/client-layout"
import { InstallPrompt } from "@/components/install-prompt"
import { CommandPalette } from "@/components/command-palette" // 🔥 Added Command Palette

const inter = Inter({ subsets: ["latin"] })

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: "CleanBuild",
  description: "Real-time construction management tool for job sites.",
  // 🔥 FIX: Next.js dynamically generates this as a .webmanifest file
  manifest: "/manifest.webmanifest",
  // 🔥 ADDED: iOS Safari requires these specific tags to look and feel native
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CleanBuild",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-900 text-slate-100 min-h-screen`} suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
        
        {/* Global Components */}
        <CommandPalette />
        <InstallPrompt />
      </body>
    </html>
  )
}