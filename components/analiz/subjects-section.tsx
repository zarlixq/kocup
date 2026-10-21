import { BookOpen } from "lucide-react"
import { loadSubjects } from "@/lib/analytics/analiz/load"
import { safeLoad, Card, NotEnough, SectionCard, SectionError, pct, type AnalizCtx } from "@/components/analiz/section"
import { SubjectSuccessBar, SubjectsTable, type SubjectTableRow } from "@/components/analiz/subjects-table"

export function detailHref(ctx: AnalizCtx, subjectId: string): string {
  const q = new URLSearchParams(ctx.query)
  q.set("detay", subjectId)
  return `${ctx.basePath}?${q.toString()}#konu-analizi`
}

export async function SubjectsSection({ ctx }: { ctx: AnalizCtx }) {
  const loaded = await safeLoad("SubjectsSection", async () => {
    const all = await loadSubjects(ctx.studentId, ctx.from, ctx.to)
    return { all }
  })
  if (!loaded) return <SectionError title="Ders analizi" />
  const { all } = loaded
  const subjects = ctx.subjectId ? all.filter((s) => s.subject_id === ctx.subjectId) : all
  const rows: SubjectTableRow[] = subjects.map((s) => ({
    id: s.subject_id,
    name: s.subject_name,
    color: s.color,
    questions: s.questions,
    correct: s.correct,
    wrong: s.wrong,
    empty: s.empty,
    success: pct(s.correct, s.questions),
    minutes: s.minutes,
    perMinute: s.minutes > 0 && s.questions > 0 ? Math.round((s.questions / s.minutes) * 10) / 10 : null,
    videoWatched: s.video_watched,
    videoTotal: s.video_total,
    topicPct: s.topics_total > 0 ? Math.round((s.topics_done / s.topics_total) * 100) : null,
    lastDate: s.last_date,
  }))
  const bar = rows
    .filter((r) => r.success !== null)
    .sort((a, b) => (a.success ?? 0) - (b.success ?? 0))
    .map((r) => ({ name: r.name, success: r.success ?? 0, questions: r.questions, color: r.color }))
  const hrefs = Object.fromEntries(rows.map((r) => [r.id, detailHref(ctx, r.id)]))

  return (
    <SectionCard
      id="ders-analizi"
      title="Ders analizi"
      icon={<BookOpen className="h-5 w-5 text-[#1B6B8A]" />}
      description="Bir derse tıkla, konu bazlı detayı aşağıda açılsın."
    >
      {rows.length === 0 ? (
        <Card>
          <NotEnough>Bu dönemde ders verisi yok. Soru kaydı ekledikçe ders analizin oluşur.</NotEnough>
        </Card>
      ) : (
        <div className="space-y-4">
          {bar.length > 0 && (
            <Card title="Ders bazlı başarı">
              <SubjectSuccessBar rows={bar} />
            </Card>
          )}
          <SubjectsTable rows={rows} detailHref={hrefs} selectedId={ctx.detailSubjectId} />
        </div>
      )}
    </SectionCard>
  )
}
