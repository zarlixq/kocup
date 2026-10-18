import { Lock, Sparkles, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"

// Program kalemi / konu hedefi sahiplik rozeti (created_by_role, migration 201).
// - "student" → koç/müdür görünümünde "Öğrenci ekledi"
// - "coach"   → öğrenci görünümünde kilitli "Koçun ekledi" (öğrenci düzenleyemez)
// - "ai"      → "Önerilen"
const VARIANTS = {
  student: { label: "Öğrenci ekledi", Icon: UserRound, cls: "bg-orange-50 text-orange-700 ring-orange-200" },
  coach: { label: "Koçun ekledi", Icon: Lock, cls: "bg-[#1B6B8A]/5 text-[#1B6B8A] ring-[#1B6B8A]/20" },
  ai: { label: "Önerilen", Icon: Sparkles, cls: "bg-violet-50 text-violet-700 ring-violet-200" },
} as const

export function OwnerBadge({
  role,
  label,
  className,
}: {
  role: keyof typeof VARIANTS
  label?: string
  className?: string
}) {
  const v = VARIANTS[role]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset whitespace-nowrap",
        v.cls,
        className,
      )}
    >
      <v.Icon className="h-2.5 w-2.5" />
      {label ?? v.label}
    </span>
  )
}
