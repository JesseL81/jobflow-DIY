"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

// ==============================================================================
// MODIFIED LOGO SVGS (1 - 14)
// ==============================================================================

// Option 1
export function LogoFastTrackAmber({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-slate-900" />
      <path d="M10 12L18 20L10 28" stroke="#FF6B00" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 12L26 20L18 28" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 12L34 20L26 28" stroke="#94A3B8" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Option 2
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

// Option 3
export function LogoLayeredFolders({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-slate-900" />
      <path d="M10 14H24L28 18H30V28H10V14Z" fill="#64748B" opacity="0.8" />
      <path d="M12 18H26L30 22H32V32H12V18Z" fill="#FF6B00" />
      <path d="M17 25L20 28L27 21" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Option 4
export function LogoBuildGrid({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" className="fill-slate-900" />
      <path d="M10 14H30M10 20H30M10 26H30" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <path d="M14 10V30M26 10V30" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
      <path d="M13 21L18 26L28 14" stroke="#FF6B00" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Option 5
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

// Option 6
export function LogoPillarsAscent({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="22" fill="#27272A" />
      <rect x="22" y="52" width="14" height="28" rx="2" fill="#52525B"/>
      <rect x="43" y="38" width="14" height="42" rx="2" fill="#EA580C"/>
      <rect x="64" y="20" width="14" height="60" rx="2" fill="#F97316"/>
    </svg>
  );
}

// Option 7
export function LogoBuildChevron({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="22" fill="#18181B" />
      <path d="M22 68L50 40L78 68" stroke="#C2410C" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22 45L50 17L78 45" stroke="#F97316" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Option 8
export function LogoLevelPrecision({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="22" fill="#18181B" />
      <rect x="15" y="38" width="70" height="24" rx="12" fill="#52525B" stroke="#FF6B00" strokeWidth="6"/>
      <circle cx="50" cy="50" r="8" fill="#FFA500"/>
      <line x1="38" y1="38" x2="38" y2="62" stroke="#FFFFFF" strokeWidth="3.5"/>
      <line x1="62" y1="38" x2="62" y2="62" stroke="#FFFFFF" strokeWidth="3.5"/>
    </svg>
  );
}

// Option 9
export function LogoTapeMeasure({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="22" fill="#18181B" />
      <rect x="20" y="25" width="50" height="50" rx="12" fill="#FF6B00" stroke="#FFFFFF" strokeWidth="3"/>
      <circle cx="45" cy="50" r="14" fill="#FFFFFF"/>
      <circle cx="45" cy="50" r="6" fill="#18181B"/>
      <path d="M70 58H85V72H70V58Z" fill="#FFFFFF" stroke="#FF6B00" strokeWidth="2"/>
    </svg>
  );
}

// Option 10
export function LogoShovelLine({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="22" fill="#27272A" />
      <path d="M42 18H58V24C58 27 54 29 50 29C46 29 42 27 42 24V18Z" stroke="#FFFFFF" strokeWidth="4" fill="none" />
      <line x1="50" y1="29" x2="50" y2="52" stroke="#FF6B00" strokeWidth="6" strokeLinecap="round" />
      <path d="M34 52H66V66C66 76 50 84 50 84C50 84 34 76 34 66V52Z" fill="#FF6B00" stroke="#FFFFFF" strokeWidth="3" />
      <line x1="50" y1="56" x2="50" y2="74" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

// Option 11
export function LogoCBFastTrack({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="22" fill="#27272A" />
      <path d="M20 70L45 45L20 20" stroke="#C2410C" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M42 70L67 45L42 20" stroke="#FF6B00" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M64 70L84 45L64 20" stroke="#FFA500" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Option 12
export function LogoCBMeasure({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="22" fill="#18181B" />
      <path d="M42 28H28C20 28 16 34 16 42V58C16 66 20 72 28 72H42" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round"/>
      <path d="M48 28H68C74 28 78 33 78 39C78 45 74 48 68 48H48V28Z" stroke="#FF6B00" strokeWidth="7"/>
      <path d="M48 48H70C76 48 80 53 80 60C80 67 76 72 70 72H48V48Z" stroke="#FFA500" strokeWidth="7"/>
    </svg>
  );
}

// Option 13 (Isometric Integrated 'C' & 'B' on 3D Block Faces)
export function LogoCBBlock({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="22" fill="#18181B" />
      
      {/* Top Face */}
      <path d="M20 38L50 20L80 38L50 56L20 38Z" fill="#FF8C00"/>
      
      {/* Left Face */}
      <path d="M20 38V68L50 85V56L20 38Z" fill="#C2410C"/>
      
      {/* Right Face */}
      <path d="M80 38V68L50 85V56L80 38Z" fill="#FF6B00"/>
      
      {/* Isometric 'C' etched on Left Face */}
      <path
        d="M44 50.4L33 43.8C28.5 41.1 26 44 26 49.5V58.5C26 64 28.5 66.9 33 69.6L44 76.2"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Isometric 'B' etched on Right Face */}
      <g stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <line x1="56" y1="52.6" x2="56" y2="75" />
        <path d="M56 52.6L68 45.4C72.5 42.7 75 44.5 75 48.5C75 52.5 72.5 55.5 68 58.2L56 65.4" />
        <path d="M56 65.4L69 57.6C73.5 54.9 76 56.7 76 60.7C76 64.7 73.5 67.7 69 70.4L56 78.2" />
      </g>
    </svg>
  );
}

// Option 14
export function LogoCBHammer({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="22" fill="#18181B" />
      <path d="M42 26H28C21.3726 26 16 31.3726 16 38V62C16 68.6274 21.3726 74 28 74H42" stroke="#FF6B00" strokeWidth="8" strokeLinecap="round"/>
      <path d="M48 26H72C78.6274 26 84 31.3726 84 38C84 44.6274 78.6274 50 72 50H48V26Z" fill="#FF8C00"/>
      <path d="M48 50H74C80.6274 50 86 55.3726 86 62C86 68.6274 80.6274 74 74 74H48V50Z" fill="#FFA500"/>
      <rect x="44" y="26" width="8" height="48" fill="#FFFFFF" rx="2" />
    </svg>
  );
}

// ==============================================================================
// MAIN PAGE DISPLAY COMPONENT
// ==============================================================================

export default function LogoPreviewPage() {
  const selectedLogos = [
    { id: 1, originalId: 34, name: "Fast Track Chevrons (Orange/Slate)", prefix: "Clean", suffix: "Build", component: LogoFastTrackAmber, colorClass: "text-amber-400" },
    { id: 2, originalId: 16, name: "Fast Track Chevrons (Blue)", prefix: "Clean", suffix: "Build", component: LogoFastTrack, colorClass: "text-blue-300" },
    { id: 3, originalId: 12, name: "Layered Folders (Orange/Slate)", prefix: "Clean", suffix: "Build", component: LogoLayeredFolders, colorClass: "text-orange-400" },
    { id: 4, originalId: 2, name: "Build Grid (Orange Checkmark)", prefix: "Clean", suffix: "Build", component: LogoBuildGrid, colorClass: "text-orange-400" },
    { id: 5, originalId: 3, name: "Dynamic Stack", prefix: "Clean", suffix: "Build", component: LogoDynamicStack, colorClass: "text-sky-400" },
    { id: 6, originalId: 60, name: "Pillars Ascent", prefix: "Clean", suffix: "Build", component: LogoPillarsAscent, colorClass: "text-orange-500" },
    { id: 7, originalId: 63, name: "Build Chevron", prefix: "Clean", suffix: "Build", component: LogoBuildChevron, colorClass: "text-orange-400" },
    { id: 8, originalId: 37, name: "Level Precision (High Contrast)", prefix: "Clean", suffix: "Build", component: LogoLevelPrecision, colorClass: "text-amber-500" },
    { id: 9, originalId: 39, name: "Tape Measure (White Contrast)", prefix: "Clean", suffix: "Build", component: LogoTapeMeasure, colorClass: "text-orange-400" },
    { id: 10, originalId: 40, name: "Construction Shovel", prefix: "Clean", suffix: "Build", component: LogoShovelLine, colorClass: "text-orange-500" },
    { id: 11, originalId: 78, name: "CB Fast Track Chevron", prefix: "Clean", suffix: "Build", component: LogoCBFastTrack, colorClass: "text-orange-500" },
    { id: 12, originalId: 71, name: "CB Measure Loop", prefix: "Clean", suffix: "Build", component: LogoCBMeasure, colorClass: "text-amber-500" },
    { id: 13, originalId: 69, name: "CB 3D Cube (Etched C & B)", prefix: "Clean", suffix: "Build", component: LogoCBBlock, colorClass: "text-orange-400" },
    { id: 14, originalId: 65, name: "CB Monogram (Extended Line)", prefix: "Clean", suffix: "Build", component: LogoCBHammer, colorClass: "text-orange-500" },
  ]

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-900 text-white min-h-screen">
      <div>
        <h2 className="text-2xl font-bold text-amber-400">📋 Selected Logo Collection (Options 1 – 14)</h2>
        <p className="text-slate-400 text-sm mt-1">
          Showing 14 filtered logos with your custom tweaks applied.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {selectedLogos.map((brand) => {
          const LogoComp = brand.component
          return (
            <Card key={brand.id} className="bg-slate-800 border-slate-700 text-white shadow-lg hover:border-amber-500/50 transition-all">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className={`text-base font-bold ${brand.colorClass}`}>
                    Option {brand.id}
                  </CardTitle>
                  <span className="text-xs text-slate-500 font-mono">
                    (Original #{brand.originalId})
                  </span>
                </div>
                <CardDescription className="text-slate-400 text-xs">
                  {brand.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 flex items-center gap-3">
                  <LogoComp className="h-9 w-9 shrink-0 shadow-md" />
                  <div>
                    <h1 className="text-xl font-extrabold tracking-tight text-white leading-none">
                      {brand.prefix}<span className={brand.colorClass}>{brand.suffix}</span>
                    </h1>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      CleanBuild Edition
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