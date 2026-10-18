import { PencilLine } from "lucide-react"
import { cn } from "@/lib/utils"

const fmt = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

// "Düzenlendi" işareti — study_sessions / exams.updated_at dolu ise (migration 197).
// `editor`: düzenleyen kişinin rolü biliniyorsa tooltip'e yazılır.
export function EditedBadge({
  updatedAt,
  editor,
  className,
}: {
  updatedAt: string | null
  editor?: "ogrenci" | "koc" | null
  className?: string
}) {
  if (!updatedAt) return null
  const when = fmt.format(new Date(updatedAt))
  const who = editor === "ogrenci" ? "Öğrenci tarafından " : editor === "koc" ? "Koç tarafından " : ""
  const title = `${who}${when} tarihinde düzenlendi`
  return (
    <span
      title={title}
      aria-label={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200 whitespace-nowrap",
        className,
      )}
    >
      <PencilLine className="h-3 w-3" />
      Düzenlendi
    </span>
  )
}
