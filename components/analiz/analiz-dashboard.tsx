import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/server"
import { getUiPreference } from "@/lib/analytics/ui-preferences-actions"
import { filterFromParams, filterToParams, mergeAnalizFilter, resolveRange, splitDate } from "@/lib/analytics/analiz/filter"
import { filterProgramSubjects } from "@/lib/program/subjects"
import { SectionBoundary } from "@/components/analiz/section-boundary"
import { AnalizFilterBar } from "@/components/analiz/filter-bar"
import { SectionSkeleton, type AnalizCtx, type AnalizMode } from "@/components/analiz/section"
import { InsightsSection, KpiSection } from "@/components/analiz/kpi-section"
import { SubjectsSection } from "@/components/analiz/subjects-section"
import { TopicsSection } from "@/components/analiz/topics-section"
import { HabitsSection } from "@/components/analiz/habits-section"
import { ExamsSection } from "@/components/analiz/exams-section"
import { ProgramSection, WrongSection } from "@/components/analiz/program-section"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Params = Record<string, string | string[] | undefined>

// Analiz merkezi — öğrenci (/ogrenci/analizim) ve koç (salt okunur,
// /koc/ogrenciler/[id]/analiz) aynı bileşenleri kullanır. Her bölüm kendi
// Suspense + hata sınırında; biri hata verirse diğerleri çalışır.
export async function AnalizDashboard({
  studentId,
  mode,
  basePath,
  searchParams,
}: {
  studentId: string
  mode: AnalizMode
  basePath: string
  searchParams: Params
}) {
  const supabase = await createClient()
  const [saved, { data: student }, { data: subjects }] = await Promise.all([
    getUiPreference("analiz_filter"),
    supabase.from("students").select("grade").eq("id", studentId).maybeSingle(),
    supabase.from("subjects").select("id, name, exam_type, grade, order").order("order"),
  ])
  const filter = filterFromParams(searchParams, mergeAnalizFilter(saved))
  const range = resolveRange(filter)
  const detail = Array.isArray(searchParams.detay) ? searchParams.detay[0] : searchParams.detay
  const ctx: AnalizCtx = {
    studentId,
    from: range.from,
    to: range.to,
    days: range.days,
    label: range.label,
    subjectId: filter.subjectId,
    split: splitDate(range),
    mode,
    basePath,
    query: filterToParams(filter).toString(),
    detailSubjectId: detail && UUID_RE.test(detail) ? detail : null,
  }
  const subjectOptions = filterProgramSubjects(subjects ?? [], student?.grade).map((s) => ({ id: s.id, name: s.name }))

  return (
    <div className="space-y-8">
      <AnalizFilterBar filter={filter} subjects={subjectOptions} rangeLabel={range.label} />

      <SectionBoundary title="Özet göstergeler">
        <Suspense fallback={<KpiSkeleton />}>
          <KpiSection ctx={ctx} />
        </Suspense>
      </SectionBoundary>
      <SectionBoundary title="İçgörüler">
        <Suspense fallback={<Skeleton className="h-28 rounded-2xl" />}>
          <InsightsSection ctx={ctx} />
        </Suspense>
      </SectionBoundary>
      <SectionBoundary title="Ders analizi">
        <Suspense fallback={<SectionSkeleton title="Ders analizi" />}>
          <SubjectsSection ctx={ctx} />
        </Suspense>
      </SectionBoundary>
      <SectionBoundary title="Konu analizi">
        <Suspense key={ctx.detailSubjectId ?? "auto"} fallback={<SectionSkeleton title="Konu analizi" rows={3} />}>
          <TopicsSection ctx={ctx} />
        </Suspense>
      </SectionBoundary>
      <SectionBoundary title="Zaman ve alışkanlık">
        <Suspense fallback={<SectionSkeleton title="Zaman ve alışkanlık" />}>
          <HabitsSection ctx={ctx} />
        </Suspense>
      </SectionBoundary>
      <SectionBoundary title="Denemeler">
        <Suspense fallback={<SectionSkeleton title="Denemeler" />}>
          <ExamsSection ctx={ctx} />
        </Suspense>
      </SectionBoundary>
      <SectionBoundary title="Program ve hedefler">
        <Suspense fallback={<SectionSkeleton title="Program ve hedefler" />}>
          <ProgramSection ctx={ctx} />
        </Suspense>
      </SectionBoundary>
      <SectionBoundary title="Yanlış defteri">
        <Suspense fallback={<SectionSkeleton title="Yanlış defteri" rows={3} />}>
          <WrongSection ctx={ctx} />
        </Suspense>
      </SectionBoundary>
    </div>
  )
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5" aria-busy="true" aria-label="Özet yükleniyor">
      {Array.from({ length: 10 }, (_, i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
  )
}
