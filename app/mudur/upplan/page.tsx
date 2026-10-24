import Link from "next/link"
import { AlertTriangle, CheckCircle2, Gauge } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/format"
import { istanbulDateStr, istanbulWeekStartStr } from "@/lib/tz"
import { getWeeklyComplianceMap, type Compliance } from "@/lib/analytics/compliance"
import { addDaysIso } from "@/lib/upplan/roadmap"
import { gatherRoadmapContext, parsePayload, roadmapFromContext, effectiveAvailableMinutes, availableMinutes } from "@/lib/upplan/roadmap-service"
import { buildProgramDraft, parseDraftItems } from "@/lib/upplan/program-service"
import { loadUpplanProfile } from "@/lib/upplan/load"
import { roadmapWarnings } from "@/lib/upplan/debug"
import { metricsByTrack } from "@/lib/upplan/metrics"
import { FEEDBACK_LABEL } from "@/lib/upplan/feedback"
import { examYearFor, gradeFor, isTrack, TRACK_LABEL, trackFor, trackHours, type Track } from "@/lib/upplan/track"
import { UpplanRegenerateButton } from "@/components/mudur/upplan-regenerate-button"

export const metadata = { title: "UpPlan izleme — KoçUp" }

const WEEKS = 4
const pct = (v: number | null) => (v === null ? "—" : `%${Math.round(v * 100)}`)

export default async function UpplanAdminPage({ searchParams }: { searchParams: Promise<{ ogrenci?: string }> }) {
  const sp = await searchParams
  const supabase = await createClient()
  const today = istanbulDateStr()
  const thisWeek = istanbulWeekStartStr()
  const since = addDaysIso(thisWeek, -7 * (WEEKS - 1))

  const [{ data: profiles }, { data: drafts }, { data: feedback }, { data: ratings }, ...weeks] = await Promise.all([
    supabase.from("student_upplan_profile").select("student_id, graduation_year, track, profiles!inner(full_name)"),
    supabase.from("upplan_program_drafts").select("student_id, status, items").gte("week_start", since),
    supabase.from("upplan_feedback").select("student_id, reason, track").gte("week_start", since),
    supabase.from("upplan_week_ratings").select("student_id, rating").gte("week_start", since),
    ...Array.from({ length: WEEKS }, (_, i) => getWeeklyComplianceMap(supabase, addDaysIso(thisWeek, -7 * i))),
  ])
  const trackOf = new Map<string, Track | null>(
    (profiles ?? []).map((p) => [p.student_id, trackFor(p.graduation_year, today) ?? (isTrack(p.track) ? p.track : null)]),
  )
  // Son WEEKS haftanın uyumu öğrenci bazında toplanır.
  const compliance = new Map<string, Compliance>()
  for (const w of weeks as Map<string, Compliance>[]) {
    for (const c of w.values()) {
      const cur = compliance.get(c.studentId) ?? { studentId: c.studentId, totalItems: 0, doneItems: 0, percent: null }
      compliance.set(c.studentId, { ...cur, totalItems: cur.totalItems + c.totalItems, doneItems: cur.doneItems + c.doneItems })
    }
  }
  const metrics = metricsByTrack({
    trackOf,
    drafts: (drafts ?? []).map((d) => ({ student_id: d.student_id, status: d.status, blocks: parseDraftItems(d.items).filter((i) => i.block_type !== "deneme").length })),
    feedback: feedback ?? [],
    compliance,
    ratings: ratings ?? [],
  })

  const students = (profiles ?? [])
    .map((p) => ({ id: p.student_id, name: p.profiles?.full_name ?? "—", track: trackOf.get(p.student_id) ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"))
  const selected = students.find((s) => s.id === sp.ogrenci) ?? null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">UpPlan izleme</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Track bazında son {WEEKS} hafta ({formatDate(since, "dd.MM.yyyy")} sonrası): taslak kabulü, blok değiştirme, uyum ve haftalık puan. Altta öğrenci bazlı debug.
        </p>
      </div>

      <section className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Track</TableHead>
              <TableHead className="text-right">Öğrenci</TableHead>
              <TableHead className="text-right">Taslak (onay / red / bekleyen)</TableHead>
              <TableHead className="text-right">Kabul</TableHead>
              <TableHead className="text-right">Blok değiştirme</TableHead>
              <TableHead>En çok neden</TableHead>
              <TableHead className="text-right">Haftalık uyum</TableHead>
              <TableHead className="text-right">Puan (1-5)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.map((m) => (
              <TableRow key={m.track}>
                <TableCell className="font-medium">{m.track === "yok" ? "Sınıf yok" : TRACK_LABEL[m.track]}</TableCell>
                <TableCell className="text-right tabular-nums">{m.students}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {m.drafts.onaylandi} / {m.drafts.reddedildi} / {m.drafts.taslak + m.drafts.koca_onerildi}
                </TableCell>
                <TableCell className="text-right tabular-nums">{pct(m.acceptance)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {pct(m.changeRate)} <span className="text-xs text-zinc-400">({m.changes})</span>
                </TableCell>
                <TableCell className="text-xs text-zinc-600">
                  {m.reasons.slice(0, 2).map((r) => `${FEEDBACK_LABEL[r.reason]} (${r.count})`).join(", ") || "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">{pct(m.compliance)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {m.ratingAvg?.toFixed(1).replace(".", ",") ?? "—"} <span className="text-xs text-zinc-400">({m.ratings})</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-[#1B6B8A]" />
          <h2 className="text-lg font-semibold text-zinc-900">Öğrenci debug</h2>
        </div>
        <form method="get" className="flex flex-col gap-2 sm:flex-row">
          <select
            name="ogrenci"
            defaultValue={selected?.id ?? ""}
            className="h-9 flex-1 rounded-md border border-zinc-200 bg-white px-2 text-sm"
            aria-label="Öğrenci seç"
          >
            <option value="">Öğrenci seç…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.track ? TRACK_LABEL[s.track] : "sınıf yok"}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" variant="accent">
            İncele
          </Button>
        </form>
        {selected && <StudentDebug studentId={selected.id} today={today} weekStart={addDaysIso(thisWeek, 7)} />}
      </section>
    </div>
  )
}

async function StudentDebug({ studentId, today, weekStart }: { studentId: string; today: string; weekStart: string }) {
  const supabase = await createClient()
  const [profile, { data: saved }] = await Promise.all([
    loadUpplanProfile(supabase, studentId),
    supabase.from("upplan_roadmaps").select("status, generated_at, payload").eq("student_id", studentId).maybeSingle(),
  ])
  if (!profile) return <p className="text-sm text-zinc-500">UpPlan profili yok.</p>
  const track = trackFor(profile.graduation_year, today) ?? profile.track
  const savedPayload = parsePayload(saved?.payload)
  const ctx = await gatherRoadmapContext(supabase, studentId, today)
  const preview = "error" in ctx ? null : roadmapFromContext(ctx)
  const program = preview ? await buildProgramDraft(supabase, studentId, weekStart, today, { previewRoadmap: preview }) : null
  // YKS track'inde yol haritasının sınav tarihi takvimdekiyle aynı olmalı (Maarif'te ufuk ders yılı sonu).
  const expectedExam = !("error" in ctx) && ctx.kind === "yks" ? ctx.examDate : null
  const savedWarnings = savedPayload ? roadmapWarnings(track, savedPayload) : []
  const previewWarnings = preview ? roadmapWarnings(track, preview, expectedExam) : []
  const hours = track ? trackHours(track) : null
  const count = (r: { items: { status: string }[] } | null, s: string) => r?.items.filter((i) => i.status === s).length ?? 0
  const comp = program && !("error" in program) ? program.meta.composition : null
  const study = comp ? comp.konu + comp.video + comp.soru + comp.tekrar + comp.analiz : 0

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <Info label="Track" value={track ? TRACK_LABEL[track] : "— (sınıf yok)"} />
        <Info label="Mezuniyet yılı" value={String(profile.graduation_year ?? "—")} />
        <Info label="Sınıf (bugün)" value={String(gradeFor(profile.graduation_year, today) ?? "—")} />
        <Info label="Sınav yılı" value={String(examYearFor({ track, graduation_year: profile.graduation_year, target_exam_year: profile.target_exam_year }, today) ?? "—")} />
        <Info label="Alan" value={profile.alan ?? (profile.alan_egilimi ? `eğilim: ${profile.alan_egilimi}` : "—")} />
        <Info
          label="Müsaitlik (etkili)"
          value={`${Math.round(availableMinutes(profile) / 60)} sa → ${track ? Math.round(effectiveAvailableMinutes(profile, track) / 60) : 0} sa`}
        />
        <Info label="Varsayılan aralık" value={hours ? `${hours.min}–${hours.max} sa/hafta` : "—"} />
        <Info label="Konu havuzu" value={"error" in ctx ? "—" : String(ctx.input.topics.length)} />
      </dl>
      {"error" in ctx && (
        <p className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4" /> Üretim engeli ({ctx.code}): {ctx.error}
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <RoadmapCard
          title={`Kayıtlı yol haritası (${saved?.status ?? "yok"})`}
          subtitle={saved?.generated_at ? formatDate(saved.generated_at, "dd.MM.yyyy HH:mm") : ""}
          counts={savedPayload ? [count(savedPayload, "aktif"), count(savedPayload, "sirada"), count(savedPayload, "zaman_kalirsa")] : null}
          examDate={savedPayload?.examDate ?? null}
          warnings={savedWarnings}
          overflow={savedPayload?.overflow?.message ?? null}
          top={savedPayload?.items.slice(0, 8).map((i) => `${i.subject_name} › ${i.topic_name}`) ?? []}
        />
        <RoadmapCard
          title="Yeni algoritmayla önizleme"
          subtitle="kaydedilmez"
          counts={preview ? [count(preview, "aktif"), count(preview, "sirada"), count(preview, "zaman_kalirsa")] : null}
          examDate={preview?.examDate ?? null}
          warnings={previewWarnings}
          overflow={preview?.overflow?.message ?? null}
          top={preview?.items.slice(0, 8).map((i) => `${i.subject_name} › ${i.topic_name} — ${i.reasons[0] ?? ""}`) ?? []}
        />
      </div>

      {program && !("error" in program) && comp && (
        <div className="rounded-xl border border-zinc-200 p-3 text-sm">
          <div className="font-medium text-zinc-900">Haftalık önizleme ({formatDate(weekStart, "dd.MM.yyyy")} haftası)</div>
          <p className="text-zinc-600">
            {Math.round(study / 60)} sa · konu+video {pct(study ? (comp.konu + comp.video) / study : null)} · soru {pct(study ? comp.soru / study : null)} · tekrar+analiz{" "}
            {pct(study ? (comp.tekrar + comp.analiz) / study : null)} · {program.items.length} blok
          </p>
          {program.meta.warnings && program.meta.warnings.length > 0 ? (
            <p className="text-amber-700">Uyarılar: {program.meta.warnings.join(", ")}</p>
          ) : (
            <p className="flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Oran ve kural kontrolleri temiz
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <UpplanRegenerateButton studentId={studentId} />
        <Button asChild size="sm" variant="ghost">
          <Link href={`/mudur/ogrenciler/${studentId}`}>Öğrenci sayfası</Link>
        </Button>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="font-medium text-zinc-900">{value}</dd>
    </div>
  )
}

function RoadmapCard(p: {
  title: string
  subtitle: string
  counts: [number, number, number] | null
  examDate: string | null
  warnings: string[]
  overflow: string | null
  top: string[]
}) {
  return (
    <div className="space-y-2 rounded-xl border border-zinc-200 p-3 text-sm">
      <div>
        <div className="font-medium text-zinc-900">{p.title}</div>
        {p.subtitle && <div className="text-xs text-zinc-500">{p.subtitle}</div>}
      </div>
      {p.counts ? (
        <p className="tabular-nums text-zinc-700">
          aktif {p.counts[0]} · sırada {p.counts[1]} · zaman kalırsa {p.counts[2]} · ufuk {p.examDate ? formatDate(p.examDate, "dd.MM.yyyy") : "—"}
        </p>
      ) : (
        <p className="text-zinc-500">Yok</p>
      )}
      {p.warnings.length > 0 && (
        <ul className="list-disc pl-5 text-amber-800">
          {p.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      {p.overflow && <p className="text-xs text-zinc-600">{p.overflow}</p>}
      {p.top.length > 0 && (
        <ol className="list-decimal space-y-0.5 pl-5 text-xs text-zinc-700">
          {p.top.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ol>
      )}
    </div>
  )
}
