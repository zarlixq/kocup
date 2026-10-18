import { StudentOverview } from "@/components/student/student-overview"
import { createClient } from "@/lib/supabase/server"
import { loadGapMap } from "@/lib/yanlis-defteri/load"
import { GapMapView } from "@/components/yanlis-defteri/gap-map-view"

export const metadata = { title: "Öğrenci Detayı — Kurum" }

export default async function KurumStudentOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // Açık haritası RPC'leri SECURITY INVOKER: kurum yöneticisi yalnız kendi
  // kurumunun öğrencisini görür, başka kurumda boş döner.
  const supabase = await createClient()
  const gap = await loadGapMap(supabase, id)
  return (
    <div className="space-y-8">
      <StudentOverview
        studentId={id}
        variant="readonly"
        appointmentsHref="/kurum"
        coachHrefPrefix="/kurum/koclar"
      />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900">Açık Haritası</h2>
        <GapMapView data={gap} mode="readonly" />
      </section>
    </div>
  )
}
