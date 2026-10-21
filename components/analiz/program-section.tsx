import { BookMarked, NotebookPen, Target } from "lucide-react"
import { loadModulePresence, loadProgramStats, loadResourceStats, loadWrongStats } from "@/lib/analytics/analiz/load"
import { fmtDay } from "@/lib/analytics/analiz/filter"
import { SubjectComparisonBar } from "@/components/charts/subject-comparison-bar"
import { safeLoad, Card, NotEnough, SectionCard, SectionError, type AnalizCtx } from "@/components/analiz/section"
import { ComplianceChart } from "@/components/analiz/program-chart"
import { PROGRAM_WEEKS } from "@/components/analiz/kpi-section"

/** Uyum grafiğinde gösterilen hafta. */
const CHART_WEEKS = 8

function BarList({ items, color = "#1B6B8A" }: { items: { label: string; sub?: string; n: number }[]; color?: string }) {
  const max = Math.max(1, ...items.map((i) => i.n))
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.label + (i.sub ?? "")} className="space-y-0.5">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="min-w-0 truncate text-zinc-800">
              {i.label}
              {i.sub && <span className="ml-1 text-xs text-zinc-400">{i.sub}</span>}
            </span>
            <span className="shrink-0 tabular-nums text-zinc-600">{i.n}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full rounded-full" style={{ width: `${(i.n / max) * 100}%`, backgroundColor: color }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export async function ProgramSection({ ctx }: { ctx: AnalizCtx }) {
  const loaded = await safeLoad("ProgramSection", async () => {
    const [presence, program, resources] = await Promise.all([
    loadModulePresence(ctx.studentId),
    loadProgramStats(ctx.studentId, PROGRAM_WEEKS),
    loadResourceStats(ctx.studentId),
    ])
    return { presence, program, resources }
  })
  if (!loaded) return <SectionError title="Program ve hedefler" />
  const { presence, program, resources } = loaded
  const weeks = program.weeks.slice(-CHART_WEEKS)
  const hasWeeks = weeks.some((w) => w.total > 0)
  const rm = program.roadmap
  const rmTotal = rm ? rm.done + rm.active + rm.waiting : 0
  const hasResources = resources.books.length > 0 || resources.playlists.length > 0
  if (!presence.program && !hasResources) return null

  return (
    <SectionCard id="program" title="Program ve hedefler" icon={<Target className="h-5 w-5 text-[#F97316]" />}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {presence.program && (
          <Card title={`Haftalık program uyumu (son ${CHART_WEEKS} hafta)`}>
            {hasWeeks ? (
              <ComplianceChart data={weeks.map((w) => ({ label: fmtDay(w.weekStart), planned: w.total, done: w.done, percent: w.percent }))} />
            ) : (
              <NotEnough>Son {CHART_WEEKS} haftada program kalemi yok.</NotEnough>
            )}
          </Card>
        )}
        {rm && rmTotal > 0 && (
          <Card title={rm.source === "upplan" ? "Konu yol haritası ilerlemesi" : "Konu hedefleri ilerlemesi"}>
            <div className="space-y-3">
              <div className="flex h-4 overflow-hidden rounded-full bg-zinc-100" role="img" aria-label="Yol haritası ilerlemesi">
                <span className="h-full bg-emerald-500" style={{ width: `${(rm.done / rmTotal) * 100}%` }} />
                <span className="h-full border-l-2 border-white bg-[#F97316]" style={{ width: `${(rm.active / rmTotal) * 100}%` }} />
              </div>
              <dl className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Tamamlanan", n: rm.done, dot: "bg-emerald-500" },
                  { label: "Devam eden", n: rm.active, dot: "bg-[#F97316]" },
                  { label: "Başlanmamış", n: rm.waiting, dot: "bg-zinc-200" },
                ].map((x) => (
                  <div key={x.label} className="rounded-xl bg-zinc-50 py-2">
                    <dt className="flex items-center justify-center gap-1 text-[11px] text-zinc-500">
                      <span className={`h-2 w-2 rounded-full ${x.dot}`} /> {x.label}
                    </dt>
                    <dd className="text-xl font-bold tabular-nums text-zinc-900">{x.n}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-xs text-zinc-500">%{Math.round((rm.done / rmTotal) * 100)} tamamlandı · toplam {rmTotal} konu</p>
            </div>
          </Card>
        )}
      </div>
      {hasResources && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SubjectComparisonBar data={resources.books} title="Kaynak bazlı çözülen soru" emptyText="Kaynak seçili soru kaydı yok 📚" height={260} />
          <Card title="Video playlist ilerlemesi">
            {resources.playlists.length === 0 ? (
              <NotEnough>Henüz video playlist&apos;i eklenmemiş.</NotEnough>
            ) : (
              <ul className="space-y-2.5">
                {resources.playlists.map((p) => (
                  <li key={p.id} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate text-zinc-800">
                        {p.name} <span className="text-xs text-zinc-400">{p.subject_name}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-zinc-600">
                        {p.watched}/{p.total}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                      <div className="h-full rounded-full bg-[#F97316]" style={{ width: `${p.total ? (p.watched / p.total) * 100 : 0}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </SectionCard>
  )
}

const ERROR_LABEL: Record<string, string> = {
  bilgi_eksik: "Bilgi eksikliği",
  islem_hatasi: "İşlem hatası",
  dikkat_okuma: "Dikkat / okuma",
  sure_yetmedi: "Süre yetmedi",
  hic_fikrim_yok: "Hiç fikrim yok",
  belirtilmemis: "Belirtilmemiş",
}
const ATOM_LABEL: Record<string, string> = { formul: "Formül", kavram: "Kavram", kural: "Kural", yontem: "Yöntem" }

export async function WrongSection({ ctx }: { ctx: AnalizCtx }) {
  const loaded = await safeLoad("WrongSection", async () => {
    const [presence, w] = await Promise.all([loadModulePresence(ctx.studentId), loadWrongStats(ctx.studentId, ctx.from, ctx.to, ctx.subjectId)])
    return { presence, w }
  })
  if (!loaded) return <SectionError title="Yanlış defteri" />
  const { presence, w } = loaded
  if (!presence.wrongs) return null
  return (
    <SectionCard
      id="yanlis-defteri"
      title="Yanlış defteri"
      icon={<NotebookPen className="h-5 w-5 text-red-500" />}
      description={w.total ? `Bu dönemde ${w.total} kayıt · ${w.unrepeated} tanesinin konusu sonrasında tekrar çalışılmadı.` : undefined}
    >
      {w.total === 0 ? (
        <Card>
          <NotEnough>Bu dönemde yanlış defterine kayıt yok.</NotEnough>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card title="Ders bazlı">
            <BarList items={w.by_subject.map((s) => ({ label: s.name, n: s.n }))} color="#ef4444" />
          </Card>
          <Card title="En çok yanlış yapılan konular">
            <BarList items={w.by_topic.map((t) => ({ label: t.name, sub: t.subject_name, n: t.n }))} color="#ef4444" />
          </Card>
          <Card title="Hata türleri ve eksik bilgi">
            <div className="space-y-4">
              <BarList items={w.by_error_type.map((e) => ({ label: ERROR_LABEL[e.type] ?? e.type, n: e.n }))} color="#F97316" />
              {w.by_atom_type.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-zinc-500">Eksik bilgi türü</div>
                  <BarList items={w.by_atom_type.map((a) => ({ label: ATOM_LABEL[a.type] ?? a.type, n: a.n }))} />
                </div>
              )}
              {w.top_atoms.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-zinc-500">En sık eksik bilgi / formül</div>
                  <ul className="flex flex-wrap gap-1.5">
                    {w.top_atoms.map((a) => (
                      <li key={a.name} className="flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700">
                        <BookMarked className="h-3 w-3" aria-hidden /> {a.name} <span className="tabular-nums text-zinc-400">×{a.n}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </SectionCard>
  )
}
