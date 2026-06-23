import { createClient } from "@/lib/supabase/server"
import { StudentResourcesManager } from "@/components/kaynaklar/student-resources-manager"
import { SubjectComparisonBar } from "@/components/charts/subject-comparison-bar"
import { loadStudentResourcesView } from "@/lib/resources/queries"
import { buildResourceComparisonData } from "@/lib/charts/builders"

export default async function KocStudentKaynaklarPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [view, comparison] = await Promise.all([
    loadStudentResourcesView(supabase, id),
    buildResourceComparisonData(supabase, id),
  ])

  return (
    <div className="space-y-6">
      <StudentResourcesManager
        studentId={id}
        items={view.items}
        catalog={view.catalog}
        subjects={view.subjects}
      />

      <SubjectComparisonBar
        data={comparison}
        title="Kaynak Bazlı Çözülen Soru"
        emptyText="Kaynak seçili soru çözüm kaydı yok 📚"
      />
    </div>
  )
}
