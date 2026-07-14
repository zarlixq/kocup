import { CalendarCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  complianceTone,
  formatCompliance,
  COMPLIANCE_TONE_CLASS,
  type Compliance,
} from "@/lib/analytics/compliance"

// ─────────────────────────────────────────────────────────────────────────
// Haftalık program uyumu rozeti — müdür + koç panellerinde paylaşılan görsel.
// ─────────────────────────────────────────────────────────────────────────

export function ComplianceBadge({
  percent,
  totalItems,
  doneItems,
  className,
  showFraction = false,
}: {
  percent: number | null
  totalItems?: number
  doneItems?: number
  className?: string
  showFraction?: boolean
}) {
  const tone = complianceTone(percent)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        COMPLIANCE_TONE_CLASS[tone],
        className,
      )}
      title={
        percent === null
          ? "Bu hafta için atanmış program yok"
          : `Haftalık program: ${doneItems ?? "?"}/${totalItems ?? "?"} madde tamamlandı`
      }
    >
      <CalendarCheck className="h-3 w-3 shrink-0" />
      {formatCompliance(percent)}
      {showFraction && percent !== null && totalItems !== undefined && (
        <span className="opacity-70">
          ({doneItems}/{totalItems})
        </span>
      )}
    </span>
  )
}

/** Compliance objesinden doğrudan rozet (kısayol). */
export function ComplianceBadgeFrom({
  compliance,
  showFraction = false,
  className,
}: {
  compliance: Compliance | null
  showFraction?: boolean
  className?: string
}) {
  return (
    <ComplianceBadge
      percent={compliance?.percent ?? null}
      totalItems={compliance?.totalItems}
      doneItems={compliance?.doneItems}
      showFraction={showFraction}
      className={className}
    />
  )
}
