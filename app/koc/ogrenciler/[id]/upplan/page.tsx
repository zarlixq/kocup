import { notFound } from "next/navigation"
import { Info } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { loadMasteryMap } from "@/lib/upplan/load"
import { MasteryMap } from "@/components/upplan/mastery-map"

export default async function KocUpplanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Bu öğrencinin koçu olduğumuzu doğrula (RLS de zaten süzer).
  const { data: student } = await supabase.from("students").select("coach_id").eq("id", id).maybeSingle()
  if (!student || student.coach_id !== user!.id) notFound()

  const data = await loadMasteryMap(supabase, id)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-zinc-900">Ustalık Haritası</h2>
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-zinc-500">
          <Info className="h-3.5 w-3.5" />
          Soru kayıtları, denemeler, yanlış defteri ve öğrencinin konu taramasından hesaplanır. Salt okunur.
        </p>
      </div>
      <MasteryMap data={data} mode="readonly" />
    </div>
  )
}
