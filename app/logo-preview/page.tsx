"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

// --- ORIGINAL 24 LOGOS ---
export function LogoConnectedFlow({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-indigo-600" />
      <path d="M12 12H26C28.2091 12 30 13.7909 30 16V16C30 18.2091 28.2091 20 26 20H18V28C18 30.2091 16.2091 32 14 32V32" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 20H28" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2" fill="#38BDF8" />
    </svg>
  )
}

export function LogoBuildGrid({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-slate-800" />
      <path d="M10 14H30M10 20H30M10 26H30" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
      <path d="M14 10V30M26 10V30" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
      <path d="M13 21L18 26L28 14" stroke="#10B981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function LogoDynamicStack({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-indigo-950" />
      <path d="M10 13L18 13L24 13" stroke="#6366F1" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M14 20L24 20L30 20" stroke="#38BDF8" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M10 27L20 27L26 27" stroke="#818CF8" strokeWidth="3.5" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}

export function LogoStructuralBeam({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-amber-500" />
      <path d="M10 11H30M10 29H30M20 11V29" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
      <path d="M14 20L20 14L26 20" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function LogoInfiniteLoop({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-cyan-600" />
      <path d="M14 16C11.7909 16 10 17.7909 10 20C10 22.2091 11.7909 24 14 24C17 24 23 16 26 16C28.2091 16 30 17.7909 30 20C30 22.2091 28.2091 24 26 24C23 24 17 16 14 16Z" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function LogoCranePeak({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-blue-700" />
      <path d="M8 30L20 10L32 30" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 20H26" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
      <circle cx="20" cy="10" r="2.5" fill="#F59E0B" />
    </svg>
  )
}

export function LogoHammerWave({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-rose-700" />
      <path d="M12 14H24M18 14V28" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M22 20C25 18 27 22 30 20" stroke="#FDE047" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function LogoMilestoneNodes({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-teal-700" />
      <circle cx="12" cy="28" r="3" fill="#34D399" />
      <circle cx="20" cy="14" r="3" fill="#38BDF8" />
      <circle cx="28" cy="22" r="3" fill="#F43F5E" />
      <path d="M12 28L20 14L28 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function LogoHexShield({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-violet-700" />
      <path d="M20 9L30 15V25L20 31L10 25V15L20 9Z" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 20L19 23L25 17" stroke="#A7F3D0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function LogoGanttArrow({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-emerald-700" />
      <rect x="10" y="12" width="12" height="4" rx="2" fill="white" />
      <rect x="16" y="18" width="14" height="4" rx="2" fill="#A7F3D0" />
      <rect x="12" y="24" width="10" height="4" rx="2" fill="white" />
      <path d="M26 26L30 26M30 26L28 24M30 26L28 28" stroke="#FDE047" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function LogoCompass({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-sky-800" />
      <circle cx="20" cy="14" r="3" stroke="white" strokeWidth="2.5" />
      <path d="M18 16L11 30M22 16L29 30" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M14 24H26" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export function LogoLayeredFolders({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-slate-900" />
      <path d="M10 14H24L28 18H30V28H10V14Z" fill="#475569" opacity="0.6" />
      <path d="M12 18H26L30 22H32V32H12V18Z" fill="#6366F1" />
      <path d="M17 25L20 28L27 21" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function LogoSafetyDiamond({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-amber-400" />
      <path d="M20 8L32 20L20 32L8 20L20 8Z" fill="#0F172A" />
      <path d="M16 20L24 20M20 16L20 24" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function LogoModernCube({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-indigo-900" />
      <path d="M20 9L30 15V25L20 31L10 25V15L20 9Z" stroke="#818CF8" strokeWidth="2" />
      <path d="M20 9V31M10 15L20 21L30 15" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function LogoLevelBubble({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-lime-500" />
      <rect x="8" y="16" width="24" height="8" rx="4" fill="#0F172A" />
      <circle cx="20" cy="20" r="2.5" fill="#A3E635" />
      <path d="M16 16V24M24 16V24" stroke="white" strokeWidth="1.5" opacity="0.6" />
    </svg>
  )
}

export function LogoFastTrack({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-blue-600" />
      <path d="M10 12L18 20L10 28" stroke="#93C5FD" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 12L26 20L18 28" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 12L34 20L26 28" stroke="#38BDF8" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// --- NEW VARIANT: Option 16 Shape with Option 4 Colors ---
export function LogoFastTrackAmber({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-amber-500" />
      <path d="M10 12L18 20L10 28" stroke="#C2410C" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 12L26 20L18 28" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 12L34 20L26 28" stroke="#9A3412" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function LogoHardhatSpark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-orange-600" />
      <path d="M10 26H30V24C30 18.4772 25.5228 14 20 14C14.4772 14 10 18.4772 10 24V26Z" stroke="white" strokeWidth="3" />
      <path d="M8 26H32" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <circle cx="20" cy="10" r="2" fill="#FDE047" />
    </svg>
  )
}

export function LogoRadarTarget({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-cyan-900" />
      <circle cx="20" cy="20" r="10" stroke="#06B6D4" strokeWidth="2" strokeDasharray="3 3" />
      <circle cx="20" cy="20" r="4" fill="#22D3EE" />
      <path d="M20 6V10M20 30V34M6 20H10M30 20H34" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export function LogoPlumbBob({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-slate-800" />
      <line x1="20" y1="8" x2="20" y2="20" stroke="#F59E0B" strokeWidth="2" />
      <path d="M14 20H26L20 32L14 20Z" fill="#F59E0B" />
      <circle cx="20" cy="8" r="2" fill="white" />
    </svg>
  )
}

export function LogoBeamCross({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-purple-800" />
      <path d="M10 20L30 20" stroke="white" strokeWidth="4" strokeLinecap="round" />
      <path d="M20 10L20 30" stroke="#C084FC" strokeWidth="4" strokeLinecap="round" />
      <rect x="17" y="17" width="6" height="6" rx="1" fill="#FDE047" />
    </svg>
  )
}

export function LogoMetricRuler({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-emerald-900" />
      <rect x="8" y="14" width="24" height="12" rx="3" fill="#10B981" />
      <path d="M12 14V19M16 14V17M20 14V20M24 14V17M28 14V19" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function LogoStepCascade({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-fuchsia-800" />
      <path d="M10 28H16V22H22V16H28V10" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="28" cy="10" r="2.5" fill="#F472B6" />
    </svg>
  )
}

export function LogoTrowelMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-neutral-800" />
      <path d="M12 28L28 12L32 16L16 32L12 28Z" fill="#94A3B8" />
      <path d="M10 16L20 26" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function LogoSolarGrid({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-sky-700" />
      <rect x="10" y="10" width="8" height="8" rx="1" fill="white" />
      <rect x="22" y="10" width="8" height="8" rx="1" fill="#7DD3FC" />
      <rect x="10" y="22" width="8" height="8" rx="1" fill="#7DD3FC" />
      <rect x="22" y="22" width="8" height="8" rx="1" fill="white" />
    </svg>
  )
}

// --- 9 NEW BUSINESS NAMES & LOGO MARKS ---
export function LogoBuilderPulse({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-emerald-600" />
      <path d="M8 22H14L17 12L21 28L25 18L28 22H32" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="21" cy="28" r="2" fill="#A7F3D0" />
    </svg>
  )
}

export function LogoSiteTrack({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-blue-700" />
      <path d="M20 9C15.5817 9 12 12.5817 12 17C12 23 20 31 20 31C20 31 28 23 28 17C28 12.5817 24.4183 9 20 9Z" stroke="white" strokeWidth="2.5" />
      <circle cx="20" cy="17" r="3" fill="#38BDF8" />
    </svg>
  )
}

export function LogoBuildOps({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-slate-900" />
      <path d="M12 12H28V28" stroke="#F59E0B" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M12 18H22V28" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2.5" fill="#FFFFFF" />
    </svg>
  )
}

export function LogoCraftSync({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-violet-800" />
      <path d="M11 15L20 22L29 15" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 23L20 30L29 23" stroke="#C084FC" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function LogoCrewHelm({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-teal-800" />
      <circle cx="20" cy="20" r="8" stroke="white" strokeWidth="2.5" />
      <path d="M20 8V32M8 20H32M11.5 11.5L28.5 28.5M11.5 28.5L28.5 11.5" stroke="#2DD4BF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function LogoFrameLine({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-amber-600" />
      <rect x="10" y="10" width="20" height="20" rx="3" stroke="white" strokeWidth="2.5" />
      <line x1="10" y1="17" x2="30" y2="17" stroke="white" strokeWidth="2" />
      <line x1="17" y1="17" x2="17" y2="30" stroke="white" strokeWidth="2" />
    </svg>
  )
}

export function LogoJobGrid({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-sky-900" />
      <rect x="10" y="10" width="8" height="8" rx="2" fill="#38BDF8" />
      <rect x="22" y="10" width="8" height="8" rx="2" fill="white" />
      <rect x="10" y="22" width="8" height="8" rx="2" fill="white" />
      <rect x="22" y="22" width="8" height="8" rx="2" fill="#38BDF8" />
    </svg>
  )
}

export function LogoBuildLogix({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-indigo-900" />
      <path d="M12 10V30" stroke="#818CF8" strokeWidth="3" strokeLinecap="round" />
      <path d="M12 14H26M12 22H28M12 28H22" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <circle cx="26" cy="14" r="2" fill="#38BDF8" />
    </svg>
  )
}

export function LogoConstructIQ({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-cyan-800" />
      <path d="M12 28L20 12L28 28" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="12" r="3" fill="#22D3EE" />
      <path d="M16 21H24" stroke="#67E8F9" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export default function LogoPreviewPage() {
  const allLogos = [
    // 1-24: JobFlow Pro
    { id: 1, name: "JobFlow", prefix: "Job", suffix: "Flow", component: LogoConnectedFlow, colorClass: "text-indigo-400" },
    { id: 2, name: "JobFlow", prefix: "Job", suffix: "Flow", component: LogoBuildGrid, colorClass: "text-emerald-400" },
    { id: 3, name: "JobFlow", prefix: "Job", suffix: "Flow", component: LogoDynamicStack, colorClass: "text-sky-400" },
    { id: 4, name: "JobFlow", prefix: "Job", suffix: "Flow", component: LogoStructuralBeam, colorClass: "text-amber-400" },
    { id: 5, name: "JobFlow", prefix: "Job", suffix: "Flow", component: LogoInfiniteLoop, colorClass: "text-cyan-400" },
    { id: 6, name: "JobFlow", prefix: "Job", suffix: "Flow", component: LogoCranePeak, colorClass: "text-blue-400" },
    { id: 7, name: "JobFlow", prefix: "Job", suffix: "Flow", component: LogoHammerWave, colorClass: "text-rose-400" },
    { id: 8, name: "JobFlow", prefix: "Job", suffix: "Flow", component: LogoMilestoneNodes, colorClass: "text-teal-400" },
    { id: 9, name: "JobFlow", prefix: "Job", suffix: "Flow", component: LogoHexShield, colorClass: "text-violet-400" },
    { id: 10, name: "JobFlow", prefix: "Job", suffix: "Flow", component: LogoGanttArrow, colorClass: "text-emerald-300" },
    { id: 11, name: "JobFlow", prefix: "Job", suffix: "Flow", component: LogoCompass, colorClass: "text-sky-300" },
    { id: 12, name: "JobFlow", prefix: "Job", suffix: "Flow", component: LogoLayeredFolders, colorClass: "text-indigo-300" },
    { id: 13, name: "JobFlow", prefix: "Job", suffix: "Flow", component: LogoSafetyDiamond, colorClass: "text-amber-300" },
    { id: 14, name: "JobFlow", prefix: "Job", suffix: "Flow", component: LogoModernCube, colorClass: "text-indigo-300" },
    { id: 15, name: "JobFlow", prefix: "Job", suffix: "Flow", component: LogoLevelBubble, colorClass: "text-lime-300" },
    { id: 16, name: "JobFlow", prefix: "Job", suffix: "Flow", component: LogoFastTrack, colorClass: "text-blue-300" },
    { id: 17, name: "JobFlow", prefix: "Job", suffix: "Flow", component: LogoHardhatSpark, colorClass: "text-orange-300" },
    { id: 18, name: "JobFlow", prefix: "Job", suffix: "Flow", component: LogoRadarTarget, colorClass: "text-cyan-300" },
    { id: 19, name: "JobFlow", prefix: "Job", suffix: "Flow", component: LogoPlumbBob, colorClass: "text-amber-400" },
    { id: 20, name: "JobFlow", prefix: "Job", suffix: "Flow", component: LogoBeamCross, colorClass: "text-purple-300" },
    { id: 21, name: "JobFlow", prefix: "Job", suffix: "Flow", component: LogoMetricRuler, colorClass: "text-emerald-300" },
    { id: 22, name: "JobFlow", prefix: "Job", suffix: "Flow", component: LogoStepCascade, colorClass: "text-fuchsia-300" },
    { id: 23, name: "JobFlow", prefix: "Job", suffix: "Flow", component: LogoTrowelMark, colorClass: "text-slate-300" },
    { id: 24, name: "JobFlow", prefix: "Job", suffix: "Flow", component: LogoSolarGrid, colorClass: "text-sky-200" },

    // 25-33: New Names
    { id: 25, name: "BuilderPulse", prefix: "Builder", suffix: "Pulse", component: LogoBuilderPulse, colorClass: "text-emerald-400" },
    { id: 26, name: "SiteTrack Pro", prefix: "SiteTrack", suffix: "Pro", component: LogoSiteTrack, colorClass: "text-blue-400" },
    { id: 27, name: "BuildOps", prefix: "Build", suffix: "Ops", component: LogoBuildOps, colorClass: "text-amber-400" },
    { id: 28, name: "CraftSync", prefix: "Craft", suffix: "Sync", component: LogoCraftSync, colorClass: "text-violet-400" },
    { id: 29, name: "CrewHelm", prefix: "Crew", suffix: "Helm", component: LogoCrewHelm, colorClass: "text-teal-400" },
    { id: 30, name: "FrameLine", prefix: "Frame", suffix: "Line", component: LogoFrameLine, colorClass: "text-amber-500" },
    { id: 31, name: "JobGrid HQ", prefix: "JobGrid", suffix: "HQ", component: LogoJobGrid, colorClass: "text-sky-400" },
    { id: 32, name: "BuildLogix", prefix: "Build", suffix: "Logix", component: LogoBuildLogix, colorClass: "text-indigo-400" },
    { id: 33, name: "ConstructIQ", prefix: "Construct", suffix: "IQ", component: LogoConstructIQ, colorClass: "text-cyan-400" },

    // 34: FastTrack in Amber (Option 16 mark + Option 4 colors)
    { id: 34, name: "JobFlow (Amber FastTrack)", prefix: "Job", suffix: "Flow", component: LogoFastTrackAmber, colorClass: "text-amber-400" },
  ]

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-900 text-white min-h-screen">
      <div>
        <h2 className="text-2xl font-bold">🎨 Ultimate Brand & Logo Showcase (34 Options)</h2>
        <p className="text-slate-400 text-sm mt-1">
          Scroll through all 34 logo marks and business name variations!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allLogos.map((brand) => {
          const LogoComp = brand.component
          return (
            <Card key={brand.id} className="bg-slate-800 border-slate-700 text-white shadow-lg hover:border-slate-500 transition-all">
              <CardHeader className="pb-3">
                <CardTitle className={`text-base font-bold ${brand.colorClass}`}>
                  Option {brand.id}
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  {brand.name} Concept
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 flex items-center gap-3">
                  <LogoComp className="h-9 w-9 shrink-0 shadow-md" />
                  <div>
                    <h1 className="text-xl font-extrabold tracking-tight text-white leading-none">
                      {brand.prefix}<span className={brand.colorClass}>{brand.suffix}</span>
                    </h1>
                    <span className={`text-[10px] font-semibold text-slate-400 uppercase tracking-wider`}>
                      Pro Edition
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </main>
  )
}