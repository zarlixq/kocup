import Link from "next/link"
import { AlertTriangle, ArrowRight, CalendarDays, RotateCcw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { TodayData } from "@/lib/upplan/load"
import { reviewText } from "@/lib/upplan/today"
import { TodayProgram } from "@/components/upplan/today-program"

// Öğrenci dashboard'unun en üstü: bugün ne yapmalıyım?
export function TodaySection({ data }: { data: TodayData }) {
  const { alert } = data
  return (
    <section className="space-y-3" aria-labelledby="bugun-baslik">
      {!data.setupDone && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#1B6B8A]/30 bg-[#1B6B8A]/5 p-4 sm:flex-row sm:items-center">
          <Sparkles className="h-6 w-6 shrink-0 text-[#1B6B8A]" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-zinc-900">Seviyeni belirleyelim</div>
            <p className="text-sm text-zinc-600">
              5 dakikalık kurulumla konu bazlı ustalık haritan çıkar; öneriler buna göre gelir.
            </p>
          </div>
          <Button asChild variant="accent" size="sm">
            <Link href="/ogrenci/upplan/kurulum">{data.hasProfile ? "Devam et" : "Başla"}</Link>
          </Button>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="bugun-baslik" className="text-base font-semibold text-zinc-900">
            Bugün
          </h2>
          {data.week.total > 0 && (
            <span className="text-xs text-zinc-500 tabular-nums">
              Bu hafta {data.week.total} bloktan {data.week.done} tanesi tamam.
            </span>
          )}
        </div>
        {data.week.total > 0 && (
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={data.week.total}
            aria-valuenow={data.week.done}
            aria-label="Haftalık ilerleme"
          >
            <div className="h-full rounded-full bg-[#1B6B8A]" style={{ width: `${(data.week.done / data.week.total) * 100}%` }} />
          </div>
        )}

        {alert && (
          <div className="mt-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {alert.kind === "overconfident" ? (
              <div>
                Şu konularda kendini fazla iyi değerlendirmiş olabilirsin:{" "}
                <span className="font-medium">{alert.topics.map((t) => t.topic_name).join(", ")}</span>.{" "}
                <Link href="/ogrenci/upplan" className="font-medium underline">
                  Haritana bak
                </Link>
              </div>
            ) : (
              <div>
                Son denemende ({alert.exam_name}) {alert.subject_name} dersinde {alert.wrong} yanlış var.{" "}
                <Link href={`/ogrenci/denemelerim/${alert.exam_id}?yanlislar=1`} className="font-medium underline">
                  Yanlışlarını konulara dağıt
                </Link>
              </div>
            )}
          </div>
        )}

        <div className="mt-3">
          {data.items.length > 0 ? (
            <TodayProgram items={data.items} />
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3 py-3 text-sm text-zinc-500">
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Bugün için programında blok yok.
              </span>
              <Link href="/ogrenci/program" className="shrink-0 font-medium text-[#1B6B8A] hover:underline">
                Programa git
              </Link>
            </div>
          )}
        </div>

        {data.reviews.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-zinc-100 pt-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Bugünün tekrarı</h3>
            {data.reviews.map((r) => (
              <Link
                key={r.topic_id}
                href={`/ogrenci/soru-cozum/yeni?konu=${r.topic_id}&soru=${r.questions}`}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 px-3 py-2.5 hover:border-[#1B6B8A]"
              >
                <RotateCcw className="h-4 w-4 shrink-0 text-[#F97316]" />
                <span className="flex-1 text-sm text-zinc-800">{reviewText(r)}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-zinc-400" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
