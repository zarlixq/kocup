"use client"

import type { ReactNode } from "react"
import { CalendarRange, CalendarDays, List } from "lucide-react"

// Randevu görünümü: varsayılan hafta, aya geçiş + yedek liste.
export type AppointmentViewMode = "week" | "month" | "list"

const ITEMS: { key: AppointmentViewMode; label: string; icon: ReactNode }[] = [
  { key: "week", label: "Hafta", icon: <CalendarRange className="h-4 w-4" /> },
  { key: "month", label: "Ay", icon: <CalendarDays className="h-4 w-4" /> },
  { key: "list", label: "Liste", icon: <List className="h-4 w-4" /> },
]

export function ViewModeToggle({
  value,
  onChange,
}: {
  value: AppointmentViewMode
  onChange: (value: AppointmentViewMode) => void
}) {
  return (
    <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5">
      {ITEMS.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => onChange(it.key)}
          aria-pressed={value === it.key}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
            value === it.key
              ? "bg-[#1B6B8A] text-white"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          {it.icon} {it.label}
        </button>
      ))}
    </div>
  )
}
