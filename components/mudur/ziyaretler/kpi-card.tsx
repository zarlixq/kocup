import { ArrowDown, ArrowUp, Minus, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type Accent = "primary" | "orange" | "emerald" | "violet"

const ACCENT_BG: Record<Accent, string> = {
  primary: "bg-sky-50",
  orange: "bg-orange-50",
  emerald: "bg-emerald-50",
  violet: "bg-violet-50",
}
const ACCENT_TEXT: Record<Accent, string> = {
  primary: "text-[#1B6B8A]",
  orange: "text-[#F97316]",
  emerald: "text-emerald-600",
  violet: "text-violet-600",
}

export function KpiCard({
  label,
  value,
  prev,
  icon: Icon,
  accent = "primary",
}: {
  label: string
  value: number
  prev: number
  icon: LucideIcon
  accent?: Accent
}) {
  // Önceki dönem 0 ise % hesaplaması NaN/Infinity üretir — özel hallediyoruz.
  const isNewData = prev === 0 && value > 0
  const isFlat = prev === 0 && value === 0
  const change = prev > 0 ? ((value - prev) / prev) * 100 : 0
  const direction: "up" | "down" | "flat" = isNewData
    ? "up"
    : isFlat
      ? "flat"
      : change > 0
        ? "up"
        : change < 0
          ? "down"
          : "flat"

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-sm font-medium text-zinc-600 leading-tight">{label}</span>
        <div
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
            ACCENT_BG[accent]
          )}
        >
          <Icon className={cn("w-5 h-5", ACCENT_TEXT[accent])} aria-hidden="true" />
        </div>
      </div>
      <div className="text-2xl md:text-3xl font-bold text-zinc-900 tabular-nums">
        {value.toLocaleString("tr-TR")}
      </div>
      <div className="text-xs mt-1.5 flex items-center gap-1 flex-wrap">
        {isNewData ? (
          <>
            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
              <ArrowUp className="w-3 h-3" aria-hidden="true" />
              Yeni
            </span>
            <span className="text-zinc-400">önceki dönemde veri yok</span>
          </>
        ) : isFlat ? (
          <span className="inline-flex items-center gap-1 text-zinc-400">
            <Minus className="w-3 h-3" aria-hidden="true" />
            önceki dönemde de veri yok
          </span>
        ) : direction === "up" ? (
          <>
            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium tabular-nums">
              <ArrowUp className="w-3 h-3" aria-hidden="true" />
              {change > 0 ? "+" : ""}
              {Math.abs(change) < 1000 ? change.toFixed(0) : "999+"}%
            </span>
            <span className="text-zinc-400">önceki döneme göre</span>
          </>
        ) : direction === "down" ? (
          <>
            <span className="inline-flex items-center gap-1 text-rose-600 font-medium tabular-nums">
              <ArrowDown className="w-3 h-3" aria-hidden="true" />
              {change.toFixed(0)}%
            </span>
            <span className="text-zinc-400">önceki döneme göre</span>
          </>
        ) : (
          <span className="inline-flex items-center gap-1 text-zinc-400">
            <Minus className="w-3 h-3" aria-hidden="true" />
            değişim yok
          </span>
        )}
      </div>
    </div>
  )
}
