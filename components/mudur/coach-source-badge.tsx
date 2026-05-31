import { Badge } from "@/components/ui/badge"
import { COACH_SOURCE_LABEL, type CoachSource, isCoachSource } from "@/lib/coach-source"

type Props = {
  source: string | null | undefined
  size?: "sm" | "default"
  className?: string
}

export function CoachSourceBadge({ source, size = "default", className }: Props) {
  const value: CoachSource = isCoachSource(source) ? source : "internal"
  const isInternal = value === "internal"

  // Internal: primary mavi tonlu; External: accent turuncu tonlu
  const cls = isInternal
    ? "bg-[#1B6B8A]/10 text-[#1B6B8A] border border-[#1B6B8A]/20"
    : "bg-[#F97316]/10 text-[#F97316] border border-[#F97316]/30"

  const sizeCls = size === "sm" ? "text-[10px] py-0 px-1.5" : "text-xs"

  return (
    <Badge variant="outline" className={`${cls} ${sizeCls} ${className ?? ""}`}>
      {COACH_SOURCE_LABEL[value]}
    </Badge>
  )
}
