import { createClient } from "@/lib/supabase/server"
import { StudentResourcesManager } from "@/components/kaynaklar/student-resources-manager"
import { SubjectComparisonBar } from "@/components/charts/subject-comparison-bar"
import { loadStudentResourcesView } from "@/lib/resources/queries"
import { buildResourceComparisonData } from "@/lib/charts/builders"

export const metadata = { title: "Kaynaklarım — KoçUp" }

export default async function KaynaklarimPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [view, comparison] = await Promise.all([
    loadStudentResourcesView(supabase, user!.id),
    buildResourceComparisonData(supabase, user!.id),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Kaynaklarım</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Kullandığın kitap ve yayınları takip et, soru çözümünü kaynağa bağla.
        </p>
      </div>

      <StudentResourcesManager
        studentId={user!.id}
        items={view.items}
        catalog={view.catalog}
        subjects={view.subjects}
      />

      <SubjectComparisonBar
        data={comparison}
        title="Kaynak Bazlı Çözülen Soru"
        emptyText="Kaynak seçili soru çözüm kaydın yok 📚"
      />
    </div>
  )
}
