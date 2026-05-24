import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "default",
}: {
  label: string
  value: string
  hint?: string
  icon: ReactNode
  accent?: "default" | "green" | "orange" | "red"
}) {
  const accentMap = {
    default: "bg-zinc-100 text-zinc-700",
    green: "bg-green-50 text-green-700",
    orange: "bg-orange-50 text-[#F97316]",
    red: "bg-red-50 text-red-700",
  }
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5 transition-all hover:shadow-md hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:transform-none">
      <div className="flex items-start justify-between mb-3">
        <div className="text-sm text-zinc-500">{label}</div>
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", accentMap[accent])}>{icon}</div>
      </div>
      <div className="text-3xl font-bold text-zinc-900 tracking-tight tabular-nums">{value}</div>
      {hint && <div className="text-xs text-zinc-500 mt-1">{hint}</div>}
    </div>
  )
}
