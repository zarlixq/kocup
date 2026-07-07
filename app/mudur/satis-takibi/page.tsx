import { createClient } from "@/lib/supabase/server"
import { SatisTakibiView } from "@/components/mudur/satis-takibi/satis-takibi-view"

export const metadata = { title: "Satış Takibi — KoçUp" }

export default async function SatisTakibiPage() {
  const supabase = await createClient()

  const { data: leads } = await supabase
    .from("sales_leads")
    .select("*")
    .order("sonraki_adim_tarihi", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })

  return (
    <div className="max-w-6xl mx-auto">
      <SatisTakibiView leads={leads ?? []} />
    </div>
  )
}
