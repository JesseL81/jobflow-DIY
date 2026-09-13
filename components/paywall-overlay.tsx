"use client"

import { Button } from "@/components/ui/button"

export function PaywallOverlay({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 z-50 bg-slate-300/70 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden text-center relative z-50 mt-[-10vh]">
        <div className="bg-slate-900 p-8 flex flex-col items-center">
          <span className="text-5xl mb-4">🏗️</span>
          <h1 className="text-2xl font-bold text-white tracking-tight">Ready to manage your own build?</h1>
          <p className="text-orange-400 text-sm font-medium mt-2">
            You are currently using a free guest account.
          </p>
        </div>
        
        <div className="p-8 space-y-6">
          <p className="text-slate-600 text-sm leading-relaxed">
            To unlock your personal workspace and start managing your own builds, upgrade to <strong className="text-slate-900">CleanBuild Pro</strong>.
          </p>
          
          <ul className="text-left space-y-3 text-sm font-medium text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <li className="flex items-center gap-2">✅ <span className="flex-1">Unlimited Projects & Schedules</span></li>
            <li className="flex items-center gap-2">✅ <span className="flex-1">Live Budget & Expense Tracking</span></li>
            <li className="flex items-center gap-2">✅ <span className="flex-1">Invite Unlimited Guests & Vendors</span></li>
            <li className="flex items-center gap-2">✅ <span className="flex-1">Automated Email Task Reminders</span></li>
          </ul>

          <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 text-base shadow-sm">
            Upgrade to Pro (Coming Soon)
          </Button>
          
          <p className="text-xs text-slate-400 mt-4">
            Toggle back to the <strong className="text-slate-500">Shared Build</strong> in your sidebar to continue collaborating for free.
          </p>
        </div>
      </div>
    </div>
  )
}