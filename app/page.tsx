"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

function LogoCBBlock({ className = "h-9 w-9", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M20 38L50 20L80 38L50 56L20 38Z" fill="#FF8C00"/>
      <path d="M20 38V68L50 85V56L20 38Z" fill="#C2410C"/>
      <path d="M80 38V68L50 85V56L80 38Z" fill="#FF6B00"/>
      <path
        d="M44 50.4L33 43.8C28.5 41.1 26 44 26 49.5V58.5C26 64 28.5 66.9 33 69.6L44 76.2"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <g stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <line x1="56" y1="52.6" x2="56" y2="75" />
        <path d="M56 52.6L68 45.4C72.5 42.7 75 44.5 75 48.5C75 52.5 72.5 55.5 68 58.2L56 65.4" />
        <path d="M56 65.4L69 57.6C73.5 54.9 76 56.7 76 60.7C76 64.7 73.5 67.7 69 70.4L56 78.2" />
      </g>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-emerald-500 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
    </svg>
  )
}

export default function MarketingLandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsLoggedIn(!!session)
    }
    checkAuth()
  }, [])

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-orange-200">
      
      {/* NAVIGATION BAR */}
      <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoCBBlock className="h-10 w-10 drop-shadow-md" />
            <span className="text-2xl font-extrabold tracking-tight text-white">
              Clean<span className="text-orange-500">Build</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <Link href="/dashboard">
                <Button className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-11 px-6 shadow-sm rounded-full">
                  Go to Dashboard →
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-bold text-slate-300 hover:text-white hidden sm:block transition-colors">
                  Log In
                </Link>
                <Link href="/login">
                  <Button className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-11 px-6 shadow-sm rounded-full">
                    Start 14-Day Free Trial
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200 mb-6 px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-full">
            The Modern Builder's OS
          </Badge>
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-8">
            Manage your custom build <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-blue-600">
              without the chaos.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
            Schedules, budgets, selections, and daily punch lists—all perfectly synced in one beautiful dashboard. Built for custom home builders and ambitious DIYers.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={isLoggedIn ? "/dashboard" : "/login"}>
              <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold h-14 px-8 text-lg rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
                {isLoggedIn ? "Open My Dashboard" : "Start 14-Day Free Trial"}
              </Button>
            </Link>
            <Button variant="outline" className="w-full sm:w-auto bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-bold h-14 px-8 text-lg rounded-full shadow-sm">
              View Live Demo
            </Button>
          </div>
        </div>
      </section>

      {/* FEATURE GRID */}
      <section className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Everything you need to break ground.</h2>
            <p className="text-slate-500 font-medium text-lg">Stop hunting through email threads and spreadsheets.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-2xl mb-6">📅</div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Smart Scheduling</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Drag-and-drop calendar built for construction. Easily adjust for rain delays and weekends.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-2xl mb-6">💰</div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Live Budgets</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Track materials and labor separately. Upload receipts instantly right from the job site.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center text-2xl mb-6">🛍️</div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Room Selections</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Organize fixtures and finishes by room. Sync approved purchases directly to your expense ledger.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center text-2xl mb-6">🤝</div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Guest Access</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Invite your spouse, general contractor, or vendors with strict read-only or edit permissions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS (STEP-BY-STEP) */}
      <section className="py-24 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">How CleanBuild Works</h2>
            <p className="text-slate-500 font-medium text-lg">From empty lot to move-in day, organized in four simple steps.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Desktop Connector Line */}
            <div className="hidden md:block absolute top-6 left-[10%] right-[10%] h-0.5 bg-slate-100 -z-10"></div>
            
            {[
              { num: 1, title: "Create Your Project", desc: "Set your budget targets, timeline, and upload your initial inspiration to the Vision Board." },
              { num: 2, title: "Invite the Team", desc: "Send secure links to your spouse, GC, or trades. You control exactly what they can see and edit." },
              { num: 3, title: "Log & Track", desc: "Use the site to manage punch lists, upload receipts, and check off daily job site tasks." },
              { num: 4, title: "Build with Confidence", desc: "Watch the dashboard calculate your remaining allowances and timeline in real-time." },
            ].map((step) => (
              <div key={step.num} className="relative flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-slate-900 text-white font-extrabold flex items-center justify-center text-lg mb-6 shadow-md ring-4 ring-white">
                  {step.num}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT THE BUILDER / WHY WE BUILT IT */}
      <section className="py-24 bg-slate-900 text-white overflow-hidden relative">
        {/* Decorative Background Element */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[800px] h-[800px] bg-blue-600 rounded-full blur-[120px] opacity-20 pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          <div>
            <Badge className="bg-slate-800 text-orange-400 border-none mb-6 px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md">
              Our Story
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-6 leading-tight">
              Built by builders, <br/>for builders.
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed mb-6">
              We got tired of juggling five different apps, chaotic text threads, and broken spreadsheets just to keep a custom home build on track. Existing construction software was either insanely expensive, built for massive enterprise firms, or required a 3-hour demo just to sign up.
            </p>
            <p className="text-slate-300 text-lg leading-relaxed mb-8">
              So we built CleanBuild. It's the exact tool we wanted for our own projects—fast, clean, offline-capable, and ridiculously easy to use from a phone in the middle of a muddy job site. 
            </p>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center text-xl">
                👷‍♂️
              </div>
              <div>
                <p className="font-bold text-white">The CleanBuild Team</p>
                <p className="text-sm text-slate-400">Fort Collins, Colorado</p>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="aspect-square md:aspect-[4/3] rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl overflow-hidden flex items-center justify-center p-8">
              {/* Abstract Placeholder for a nice image or dashboard graphic later */}
              <div className="w-full h-full border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center justify-center text-slate-500">
                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
                <span className="font-medium text-sm">Dashboard Interface Preview</span>
              </div>
            </div>
            {/* Floating stats card */}
            <div className="absolute -bottom-6 -left-6 bg-white text-slate-900 p-6 rounded-2xl shadow-xl border border-slate-200">
              <p className="text-3xl font-extrabold text-blue-600 mb-1">100%</p>
              <p className="text-sm font-bold text-slate-600">Built for the Job Site</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section className="py-24 bg-slate-50 border-t border-slate-200" id="pricing">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Simple, honest pricing.</h2>
            <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">
              No bloated enterprise contracts. Pay for what you build, when you build it. Every plan includes a 14-day free trial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            
            {/* Standard Tier */}
            <div className="bg-white border border-slate-200 rounded-3xl p-8 lg:p-10 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Single Build</h3>
              <p className="text-slate-500 mb-6 text-sm">Perfect for DIYers and owner-builders.</p>
              <div className="mb-6">
                <span className="text-5xl font-extrabold text-slate-900">$49</span>
                <span className="text-slate-500 font-medium ml-2">per project</span>
              </div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-8 bg-blue-50 inline-block px-3 py-1 rounded-md">
                One-Time Flat Fee
              </p>
              
              <ul className="space-y-4 mb-8 text-slate-700 text-sm font-medium">
                <li className="flex items-center"><CheckIcon /> 14-Day Free Trial</li>
                <li className="flex items-center"><CheckIcon /> Full access to all core modules</li>
                <li className="flex items-center"><CheckIcon /> Unlimited guest invites</li>
                <li className="flex items-center"><CheckIcon /> Offline data sync</li>
                <li className="flex items-center"><CheckIcon /> Mobile & desktop access</li>
              </ul>
              
              <Link href="/login">
                <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-12 rounded-xl">
                  Start 14-Day Free Trial
                </Button>
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 lg:p-10 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-48 h-48 bg-blue-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
              
              <Badge className="absolute top-6 right-6 bg-orange-500 text-white border-none text-xs font-bold uppercase tracking-wider px-3 py-1">
                For Pros
              </Badge>
              
              <h3 className="text-2xl font-bold text-white mb-2">Pro Builder</h3>
              <p className="text-slate-400 mb-6 text-sm">Built for General Contractors & Firm Owners.</p>
              <div className="mb-2">
                <span className="text-5xl font-extrabold text-white">$250</span>
                <span className="text-slate-400 font-medium ml-2">/ month</span>
              </div>
              <p className="text-slate-400 text-sm font-medium mb-8">
                or <strong className="text-white">$149</strong> per project (pay-as-you-go)
              </p>
              
              <ul className="space-y-4 mb-8 text-slate-300 text-sm font-medium relative z-10">
                <li className="flex items-center"><CheckIcon /> Everything in Single Build</li>
                <li className="flex items-center"><CheckIcon /> Unlimited concurrent active projects</li>
                <li className="flex items-center"><CheckIcon /> Client portal & premium reporting</li>
                <li className="flex items-center"><CheckIcon /> Multi-team workspace switching</li>
                <li className="flex items-center"><CheckIcon /> Custom company branding</li>
              </ul>
              
              <Link href="/login">
                <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 rounded-xl relative z-10 shadow-md">
                  Start 14-Day Free Trial
                </Button>
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-24 bg-white border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            <details className="group bg-slate-50 rounded-2xl border border-slate-200 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex items-center justify-between cursor-pointer p-6 font-bold text-lg text-slate-900">
                Do I have to enter a credit card to start the trial?
                <span className="transition duration-300 group-open:-rotate-180 text-blue-600 text-2xl">▾</span>
              </summary>
              <div className="px-6 pb-6 text-slate-600 leading-relaxed">
                Absolutely not. You can create an account and start using all the features immediately with just an email address. We only ask for payment if you decide to continue using the software after your 14-day trial ends.
              </div>
            </details>

            <details className="group bg-slate-50 rounded-2xl border border-slate-200 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex items-center justify-between cursor-pointer p-6 font-bold text-lg text-slate-900">
                Can I invite my spouse or my subcontractors?
                <span className="transition duration-300 group-open:-rotate-180 text-blue-600 text-2xl">▾</span>
              </summary>
              <div className="px-6 pb-6 text-slate-600 leading-relaxed">
                Yes. CleanBuild includes unlimited guest invites on all plans. You can invite your spouse with full edit access to help with Selections, and invite your subs with read-only access to the Schedule so they know exactly when to show up.
              </div>
            </details>

            <details className="group bg-slate-50 rounded-2xl border border-slate-200 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex items-center justify-between cursor-pointer p-6 font-bold text-lg text-slate-900">
                Does CleanBuild work offline on the job site?
                <span className="transition duration-300 group-open:-rotate-180 text-blue-600 text-2xl">▾</span>
              </summary>
              <div className="px-6 pb-6 text-slate-600 leading-relaxed">
                Yes! We built a custom offline-sync engine. If you lose cell service on a remote job site, you can still check off punch list items, add expenses, and view your schedule. The app automatically pushes your changes to the cloud the moment you reconnect.
              </div>
            </details>

            <details className="group bg-slate-50 rounded-2xl border border-slate-200 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex items-center justify-between cursor-pointer p-6 font-bold text-lg text-slate-900">
                Is this for DIYers or General Contractors?
                <span className="transition duration-300 group-open:-rotate-180 text-blue-600 text-2xl">▾</span>
              </summary>
              <div className="px-6 pb-6 text-slate-600 leading-relaxed">
                Both. Our "Single Build" plan is specifically designed and priced for owner-builders and ambitious DIYers who just want to manage their own home build. Our "Pro Builder" plan unlocks multi-project switching and advanced reporting for GCs running multiple crews.
              </div>
            </details>
          </div>
        </div>
      </section>
      
      {/* SIMPLE FOOTER */}
      <footer className="bg-slate-50 border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
             <LogoCBBlock className="h-6 w-6 opacity-50" />
             <span className="text-slate-400 font-bold text-sm tracking-tight">CleanBuild © {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-6 text-sm font-medium text-slate-500">
            <a href="#" className="hover:text-slate-900 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>

    </div>
  )
}