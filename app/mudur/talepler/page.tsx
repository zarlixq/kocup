import { createClient } from "@/lib/supabase/server"
import { TaleplerView } from "@/components/mudur/talepler/talepler-view"

export const metadata = { title: "Başvurular — KoçUp" }

export default async function TaleplerPage() {
  const supabase = await createClient()

  const [{ data: kurum }, { data: koc }, { data: ogrenci }] = await Promise.all([
    supabase
      .from("institution_inquiries")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("koc_applications")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("ogrenci_applications")
      .select("*")
      .order("created_at", { ascending: false }),
  ])

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Başvurular</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Kurum, koç ve öğrenci başvurularını incele ve durumlarını yönet.
        </p>
      </header>

      <TaleplerView
        kurumBasvurular={kurum ?? []}
        kocBasvurular={koc ?? []}
        ogrenciBasvurular={ogrenci ?? []}
      />
    </div>
  )
}
