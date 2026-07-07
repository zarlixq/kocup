import { cn } from "@/lib/utils"
import { DURUM_COLORS, DURUM_LABEL, type Durum } from "@/lib/satis-takibi"

export function DurumBadge({
  durum,
  className,
}: {
  durum: Durum
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        DURUM_COLORS[durum],
        className,
      )}
    >
      {DURUM_LABEL[durum]}
    </span>
  )
}
