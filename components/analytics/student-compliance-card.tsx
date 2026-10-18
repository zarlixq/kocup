import Link from "next/link"
import { CalendarCheck, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { complianceTone, type ComplianceTone, type ComplianceWeek } from "@/lib/analytics/compliance"
import { formatWeekRange } from "@/lib/week"

// Öğrencinin kendi haftalık program uyumu — koç/müdür panelleriyle AYNI formül
// (lib/analytics/compliance.ts). Program yoksa "Program yok", 0% değil.

const BAR: Record<ComplianceTone, string> = {
  none: "bg-zinc-200",
  low: "bg-red-400",
  mid: "bg-amber-400",
  high: "bg-emerald-500",
}
const TEXT: Record<ComplianceTone, string> = {
  none: "text-zinc-400",
  low: "text-red-600",
  mid: "text-amber-600",
  high: "text-emerald-600",
}

function weekLabel(i: number, n: number) {
  const ago = n - 1 - i
  return ago === 0 ? "Bu hf" : `${ago} hf önce`
}

export function StudentComplianceCard({
  history,
  href = "/ogrenci/program",
  emptyCta = "Programını oluştur",
}: {
  /** Eskiden yeniye; son eleman bu hafta. */
  history: ComplianceWeek[]
  href?: string
  emptyCta?: string
}) {
  const current = history[history.length - 1]?.compliance ?? null
  const tone = complianceTone(current?.percent ?? null)
  const anyProgram = history.some((w) => w.compliance)

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-[#F97316]" /> Haftalık Program Uyumu
        </h3>
        <Link href={href} className="inline-flex items-center text-xs text-[#1B6B8A] hover:underline">
          Program <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {!anyProgram ? (
        <div className="mt-4 text-sm text-zinc-500">
          Bu hafta için programın yok. Kalem ekleyip tamamladıkça uyumun burada görünür.
          <div className="mt-3">
            <Link
              href={href}
              className="inline-flex items-center gap-1 rounded-lg bg-[#F97316] px-3 py-2 text-xs font-medium text-white hover:bg-orange-600"
            >
              {emptyCta}
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className={cn("text-3xl font-bold tabular-nums", TEXT[tone])}>
              {current?.percent == null ? "—" : `%${current.percent}`}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              {current ? `${current.doneItems}/${current.totalItems} kalem tamamlandı` : "Bu hafta program yok"}
            </div>
          </div>
          <div className="flex items-end gap-2" aria-label="Son haftaların uyumu">
            {history.map((w, i) => {
              const pct = w.compliance?.percent ?? null
              const t = complianceTone(pct)
              return (
                <div key={w.weekStart} className="flex flex-col items-center gap-1" title={`${formatWeekRange(w.weekStart)}: ${pct == null ? "Program yok" : `%${pct}`}`}>
                  <span className="text-[10px] tabular-nums text-zinc-500">{pct == null ? "–" : pct}</span>
                  <div className="flex h-12 w-5 items-end overflow-hidden rounded bg-zinc-100">
                    {/* Yükseklik veriye bağlı → Tailwind sınıfıyla ifade edilemez. */}
                    <div className={cn("w-full rounded-t", BAR[t])} style={{ height: `${Math.max(pct ?? 0, pct == null ? 0 : 6)}%` }} />
                  </div>
                  <span className="text-[9px] text-zinc-400 whitespace-nowrap">{weekLabel(i, history.length)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
