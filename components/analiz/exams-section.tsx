import { ArrowDownRight, ArrowUpRight, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"
import { loadExams, type ExamRow } from "@/lib/analytics/analiz/load"
import { fmtDay } from "@/lib/analytics/analiz/filter"
import { safeLoad, Card, NotEnough, SectionCard, SectionError, type AnalizCtx } from "@/components/analiz/section"
import { ExamsChart, type ExamChartType } from "@/components/analiz/exams-chart"

const TYPE_LABEL: Record<string, string> = { tyt: "TYT", ayt: "AYT", lgs: "LGS" }
const r2 = (n: number) => Math.round(n * 100) / 100
const fmtNet = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 2 })

function chartType(type: string, exams: ExamRow[]): ExamChartType {
  const series = new Map<string, { key: string; name: string; color: string }>()
  const rows = exams.map((e) => {
    const row: ExamChartType["rows"][number] = { date: e.date, name: e.name, net: e.net }
    for (const s of e.subjects) {
      const key = `s_${s.subject_id}`
      row[key] = s.net
      if (!series.has(key)) series.set(key, { key, name: s.name, color: s.color ?? "" })
    }
    return row
  })
  return { type, label: TYPE_LABEL[type] ?? type.toUpperCase(), rows, series: Array.from(series.values()) }
}

/** Ders bazlı net değişimi: son deneme vs önceki denemelerin ortalaması. */
function subjectChanges(exams: ExamRow[]) {
  if (exams.length < 2) return []
  const last = exams[exams.length - 1]
  const before = exams.slice(0, -1)
  return last.subjects
    .map((s) => {
      const prev = before.map((e) => e.subjects.find((x) => x.subject_id === s.subject_id)?.net).filter((n): n is number => n !== undefined)
      if (prev.length === 0) return null
      const avg = prev.reduce((a, b) => a + b, 0) / prev.length
      return { name: s.name, net: s.net, delta: r2(s.net - avg) }
    })
    .filter((x): x is { name: string; net: number; delta: number } => x !== null)
    .sort((a, b) => a.delta - b.delta)
}

export async function ExamsSection({ ctx }: { ctx: AnalizCtx }) {
  const loaded = await safeLoad("ExamsSection", async () => {
    const exams = await loadExams(ctx.studentId, ctx.from, ctx.to, ctx.subjectId)
    return { exams }
  })
  if (!loaded) return <SectionError title="Denemeler" />
  const { exams } = loaded
  if (exams.length === 0) return null
  const byType = new Map<string, ExamRow[]>()
  for (const e of exams) byType.set(e.exam_type, [...(byType.get(e.exam_type) ?? []), e])
  const order = ["tyt", "ayt", "lgs"]
  const types = Array.from(byType.keys()).sort((a, b) => order.indexOf(a) - order.indexOf(b))

  return (
    <SectionCard id="denemeler" title="Denemeler" icon={<ClipboardList className="h-5 w-5 text-[#1B6B8A]" />}>
      <Card title="Net seyri">
        <ExamsChart types={types.map((t) => chartType(t, byType.get(t)!))} />
      </Card>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {types.map((t) => {
          const list = byType.get(t)!
          const last = list[list.length - 1]
          const avg = r2(list.reduce((s, e) => s + e.net, 0) / list.length)
          const best = list.reduce((b, e) => (e.net > b.net ? e : b), list[0])
          const changes = subjectChanges(list)
          return (
            <Card key={t} title={`${TYPE_LABEL[t] ?? t.toUpperCase()} karşılaştırma`}>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Son deneme", value: last.net, sub: fmtDay(last.date, true) },
                  { label: "Ortalama", value: avg, sub: `${list.length} deneme` },
                  { label: "En iyi", value: best.net, sub: fmtDay(best.date, true) },
                ].map((x) => (
                  <div key={x.label} className="rounded-xl bg-zinc-50 px-2 py-3">
                    <div className="text-[11px] text-zinc-500">{x.label}</div>
                    <div className="text-xl font-bold tabular-nums text-zinc-900">{fmtNet(x.value)}</div>
                    <div className="text-[11px] tabular-nums text-zinc-400">{x.sub}</div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Son deneme ortalamanın {last.net >= avg ? `${fmtNet(r2(last.net - avg))} net üstünde` : `${fmtNet(r2(avg - last.net))} net altında`}.
              </p>
              {changes.length > 0 && (
                <div className="mt-3 space-y-1">
                  <div className="text-xs font-medium text-zinc-600">Ders bazlı net değişimi (son deneme vs önceki ortalama)</div>
                  <ul className="divide-y divide-zinc-100 text-sm">
                    {changes.map((c) => (
                      <li key={c.name} className="flex items-center justify-between py-1.5">
                        <span className="text-zinc-800">{c.name}</span>
                        <span
                          className={cn(
                            "flex items-center gap-0.5 tabular-nums text-xs font-semibold",
                            c.delta > 0 ? "text-emerald-600" : c.delta < 0 ? "text-red-600" : "text-zinc-400",
                          )}
                        >
                          {c.delta > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : c.delta < 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : null}
                          {c.delta > 0 ? "+" : ""}
                          {fmtNet(c.delta)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {list.length < 2 && <NotEnough>Karşılaştırma için en az 2 deneme gerekiyor.</NotEnough>}
            </Card>
          )
        })}
      </div>
    </SectionCard>
  )
}
