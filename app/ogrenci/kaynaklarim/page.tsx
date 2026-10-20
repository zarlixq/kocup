import { createClient } from "@/lib/supabase/server"
import { StudentResourcesManager } from "@/components/kaynaklar/student-resources-manager"
import { SubjectComparisonBar } from "@/components/charts/subject-comparison-bar"
import { loadStudentResourcesView } from "@/lib/resources/queries"
import { buildResourceComparisonData } from "@/lib/charts/builders"
import { VideoPlaylists } from "@/components/kaynaklar/video-playlists"
import { loadPlaylists, loadTeacherStats, youtubeEnabled } from "@/lib/resources/videos"
import { fetchActiveTopics } from "@/lib/curriculum/active-topics"

export const metadata = { title: "Kaynaklarım — KoçUp" }

export default async function KaynaklarimPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [view, comparison, playlists] = await Promise.all([
    loadStudentResourcesView(supabase, user!.id),
    buildResourceComparisonData(supabase, user!.id),
    loadPlaylists(supabase, user!.id),
  ])
  const subjectIds = Array.from(new Set(playlists.map((p) => p.subject_id)))
  const [topics, stats] = await Promise.all([
    subjectIds.length ? fetchActiveTopics(supabase) : Promise.resolve([]),
    loadTeacherStats(supabase, user!.id, playlists),
  ])
  const topicsBySubject: Record<string, { id: string; name: string }[]> = {}
  for (const t of topics) if (subjectIds.includes(t.subject_id)) (topicsBySubject[t.subject_id] ??= []).push({ id: t.id, name: t.name })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Kaynaklarım</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Kullandığın kitap, yayın ve video playlist&apos;lerini takip et; soru çözümünü kaynağa bağla.
        </p>
      </div>

      <StudentResourcesManager
        studentId={user!.id}
        items={view.items}
        catalog={view.catalog}
        subjects={view.subjects}
      />

      <VideoPlaylists
        playlists={playlists}
        subjects={view.subjects}
        topicsBySubject={topicsBySubject}
        youtubeEnabled={youtubeEnabled()}
        stats={stats}
      />

      <SubjectComparisonBar
        data={comparison}
        title="Kaynak Bazlı Çözülen Soru"
        emptyText="Kaynak seçili soru çözüm kaydın yok 📚"
      />
    </div>
  )
}
