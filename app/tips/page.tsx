"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const TOPICS = [
  {
    id: "budgeting",
    category: "Budgeting",
    icon: "💰",
    title: "Always add a 10% - 15% Contingency Buffer",
    summary: "Unforeseen issues like rotted subflooring, plumbing reroutes, or material price surges happen on almost every project. Building a 15% safety buffer into your total estimate prevents budget panic midway through.",
    bullets: [
      "Key reason for buffer: Structural rot hidden inside walls or under subfloors.",
      "Buffer must also cover material price surges for commodities like lumber, copper, and PVC.",
      "Test of a line i have added to budgeting"
    ],
  },
  {
    id: "scheduling",
    category: "Scheduling",
    icon: "📅",
    title: "Order Materials 2-3 Weeks Before Work Begins",
    summary: "Custom windows, specialty tile, and structural lumber frequently experience delivery delays. Secure all lead-time materials prior to demolition so your work area doesn't sit idle.",
    bullets: [
      "Confirm main delivery date 4 days before job start.",
      "Track the highest lead-time items weekly: custom windows, appliances, and specialty hardware.",
    ],
  },
  {
    id: "best-practices",
    category: "Best Practices",
    icon: "📷",
    title: "Document Everything with Daily Photo Logs",
    summary: "Before closing up walls with drywall, snap clear photos of all electrical wiring, plumbing runs, and structural framing. You will thank yourself years later when hanging heavy fixtures or diagnosing leaks.",
    bullets: [
      "Use wide-angle shots showing stud layout and electrical junction box placement.",
      "Take close-up photos of pipe manifolds, main sewer lines, and structural blocking.",
    ],
  },
  {
    id: "permitting",
    category: "Permitting",
    icon: "📜",
    title: "Pull Permits Early to Avoid Stop-Work Orders",
    summary: "City building departments often take 2 to 6 weeks to review plans. Starting work without permits can result in costly fines or having to tear down uninspected work.",
    bullets: [
      "Confirm complete required documentation (site plans, engineering specs) before submission.",
      "Schedule your main rough-in inspections 3 days in advance.",
    ],
  },
  {
    id: "Testing",
    category: "My new topic",
    icon: "📜",
    title: "aaaaa Pull Permits Early to Avoid Stop-Work Orders",
    summary: "aaaaa City building departments often take 2 to 6 weeks to review plans. Starting work without permits can result in costly fines or having to tear down uninspected work.",
    bullets: [
      "Confirm complete required documentation (site plans, engineering specs) before submission.",
      "Schedule your main rough-in inspections 3 days in advance.",
    ],
  },
]

export default function TipsPage() {
  const [activeTopicId, setActiveTopicId] = useState<string>("budgeting")

  const activeTopic = TOPICS.find((t) => t.id === activeTopicId) || TOPICS[0]

  return (
    <main className="p-6 bg-slate-100 min-h-screen space-y-6 flex flex-col text-slate-950">
      
      {/* LOCKED HEIGHT HEADER BUBBLE: Standardized to exactly md:h-[140px] */}
      <div className="bg-slate-900 text-white p-6 md:px-8 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:h-[140px]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">💡 Tips, Tricks & Best Practices</h1>
          </div>
          <p className="text-sm font-medium text-orange-400 mt-1.5 leading-relaxed max-w-2xl">
            Hover over or click a topic on the left to view strategies and site management tips.
          </p>
        </div>
        
        {/* Right side element to match the structural weight of the Templates header */}
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant="outline" className="text-slate-300 border-slate-700 bg-slate-800/60 font-semibold px-4 py-2 text-xs rounded-lg uppercase tracking-wider">
            Contractor Guide
          </Badge>
        </div>
      </div>

      {/* Two-Column Interactive Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start flex-1">
        {/* Left Side: Topic Selector List (4 Columns) */}
        <div className="md:col-span-4 space-y-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 mb-3">
            Topics
          </h3>
          {TOPICS.map((topic) => {
            const isActive = topic.id === activeTopicId

            return (
              <button
                key={topic.id}
                onMouseEnter={() => setActiveTopicId(topic.id)}
                onClick={() => setActiveTopicId(topic.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between ${
                  isActive
                    ? "bg-slate-900 text-white border-slate-900 shadow-md font-semibold"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{topic.icon}</span>
                  <div>
                    <div className="text-sm font-bold">{topic.category}</div>
                    <div className={`text-xs ${isActive ? "text-slate-300" : "text-slate-500"}`}>
                      {topic.bullets.length} best practices
                    </div>
                  </div>
                </div>
                <span className={`text-sm ${isActive ? "text-indigo-400 font-bold" : "text-slate-400"}`}>
                  →
                </span>
              </button>
            )
          })}
        </div>

        {/* Right Side: Detailed Content Card (8 Columns) */}
        <div className="md:col-span-8">
          <Card className="bg-white border shadow-xs min-h-[380px]">
            <CardHeader className="pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between gap-3 mb-1">
                <Badge variant="secondary" className="text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {activeTopic.icon} {activeTopic.category}
                </Badge>
              </div>
              <CardTitle className="text-xl font-bold text-slate-950 leading-snug">
                {activeTopic.title}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Overview and checklist for {activeTopic.category.toLowerCase()} management.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Summary Box */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Strategy Overview
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 p-4 rounded-lg border">
                  {activeTopic.summary}
                </p>
              </div>

              {/* Bullet Points */}
              {activeTopic.bullets && activeTopic.bullets.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    {activeTopic.category} Best Practices Checklist:
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {activeTopic.bullets.map((bullet, index) => (
                      <li key={index} className="flex items-start gap-2.5 leading-relaxed bg-slate-50/50 p-2.5 rounded-md border border-slate-100">
                        <span className="text-indigo-600 font-bold text-sm leading-none">•</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Version Tracker Footer */}
      <div className="w-full text-center py-6 text-xs text-slate-500 border-t border-slate-200 mt-8">
        CleanBuild v1.03
      </div>
      
    </main>
  )
}