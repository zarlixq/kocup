import { notFound } from "next/navigation"
import { Info } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { loadGapMap } from "@/lib/yanlis-defteri/load"
import { GapMapView } from "@/components/yanlis-defteri/gap-map-view"

export default async function KocAcikHaritasiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Bu öğrencinin koçu olduğumuzu doğrula (RLS de zaten süzer).
  const { data: student } = await supabase.from("students").select("coach_id").eq("id", id).maybeSingle()
  if (!student || student.coach_id !== user!.id) notFound()

  const gap = await loadGapMap(supabase, id)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-zinc-900">Açık Haritası</h2>
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-zinc-500">
          <Info className="h-3.5 w-3.5" />
          Öğrencinin yanlış defterinden: hata tipleri ve bilgi atomu bazında açıklar. Salt okunur.
        </p>
      </div>
      <GapMapView data={gap} mode="readonly" />
    </div>
  )
}
