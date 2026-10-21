import { createClient } from "@/lib/supabase/server"
import { StudentResourcesManager } from "@/components/kaynaklar/student-resources-manager"
import { SubjectComparisonBar } from "@/components/charts/subject-comparison-bar"
import { loadStudentResourcesView } from "@/lib/resources/queries"
import { buildResourceComparisonData } from "@/lib/charts/builders"
import { VideoModule } from "@/components/kaynaklar/video-module"
import { loadPlaylists, loadTeacherStats } from "@/lib/resources/videos"
import { loadPriorityContext } from "@/lib/resources/video-context"
import { prioritizeVideos } from "@/lib/resources/video-priority"
import { fetchActiveTopics } from "@/lib/curriculum/active-topics"
import { filterProgramSubjects } from "@/lib/program/subjects"
import { loadUpplanProfile } from "@/lib/upplan/load"
import { availabilityMinutes, weekdaysFromAvailability } from "@/lib/resources/playlist-plan"
import { istanbulDateStr } from "@/lib/tz"

export const metadata = { title: "Kaynaklarım — KoçUp" }

export default async function KaynaklarimPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user!.id

  const [view, comparison, playlists, priorityCtx, { data: student }, { data: allSubjects }, upplan] = await Promise.all([
    loadStudentResourcesView(supabase, userId),
    buildResourceComparisonData(supabase, userId),
    loadPlaylists(supabase, userId),
    loadPriorityContext(supabase, userId),
    supabase.from("students").select("grade").eq("id", userId).maybeSingle(),
    supabase.from("subjects").select("id, name, exam_type, grade, order").order("order"),
    loadUpplanProfile(supabase, userId),
  ])
  const subjectIds = Array.from(new Set(playlists.map((p) => p.subject_id)))
  const [topics, stats] = await Promise.all([
    subjectIds.length ? fetchActiveTopics(supabase) : Promise.resolve([]),
    loadTeacherStats(supabase, userId, playlists),
  ])
  const topicsBySubject: Record<string, { id: string; name: string }[]> = {}
  for (const t of topics) if (subjectIds.includes(t.subject_id)) (topicsBySubject[t.subject_id] ??= []).push({ id: t.id, name: t.name })

  // Ekleme dialog'u: öğrencinin sınıfına uygun dersler (LGS / YKS).
  const videoSubjects = filterProgramSubjects(allSubjects ?? [], student?.grade)
    .map((s) => ({ id: s.id, name: s.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"))

  // Playlist planı varsayılanları: UpPlan müsaitlik ızgarası (yoksa her gün).
  const hasGrid = !!upplan && Object.keys(upplan.availability).length > 0
  const planContext = {
    today: istanbulDateStr(),
    weekdays: weekdaysFromAvailability(upplan?.availability),
    availability: hasGrid ? availabilityMinutes(upplan!.availability) : null,
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Kaynaklarım</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Kullandığın kitap, yayın ve konu anlatımı videolarını takip et; soru çözümünü kaynağa bağla.
        </p>
      </div>

      <StudentResourcesManager
        studentId={userId}
        items={view.items}
        catalog={view.catalog}
        subjects={view.subjects}
      />

      <VideoModule
        playlists={playlists}
        subjects={videoSubjects}
        topicsBySubject={topicsBySubject}
        suggestions={prioritizeVideos(playlists, priorityCtx)}
        stats={stats}
        planContext={planContext}
      />

      <SubjectComparisonBar
        data={comparison}
        title="Kaynak Bazlı Çözülen Soru"
        emptyText="Kaynak seçili soru çözüm kaydın yok 📚"
      />
    </div>
  )
}
