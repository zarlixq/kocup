import { createClient } from "@/lib/supabase/server"
import { BasvuruKarti } from "@/blocks/mudur/basvuru-karti"

export const metadata = { title: "Başvurular — KoçUp" }

export default async function BasvurularPage() {
  const supabase = await createClient()

  const { data: applications } = await supabase
    .from("applications")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Bekleyen Başvurular</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {applications?.length ?? 0} başvuru değerlendirme bekliyor.
        </p>
      </div>

      {!applications || applications.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
          <p className="text-zinc-500">Bekleyen başvuru bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <BasvuruKarti key={app.id} application={app} />
          ))}
        </div>
      )}
    </div>
  )
}
