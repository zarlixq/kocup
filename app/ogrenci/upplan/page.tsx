import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { loadMasteryMap } from "@/lib/upplan/load"
import { MasteryMap } from "@/components/upplan/mastery-map"

export const metadata = { title: "UpPlan — KoçUp" }

export default async function UpplanPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const data = await loadMasteryMap(supabase, user!.id)
  if (!data.profile?.completed_at) redirect("/ogrenci/upplan/kurulum")

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">UpPlan</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Konu bazlı ustalık haritan. Soru kaydı, deneme ve yanlış defteri girdikçe güncellenir.
        </p>
      </div>
      <MasteryMap data={data} mode="student" />
    </div>
  )
}
