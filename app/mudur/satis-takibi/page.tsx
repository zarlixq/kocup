import { createClient } from "@/lib/supabase/server"
import { SatisTakibiView } from "@/components/mudur/satis-takibi/satis-takibi-view"
import { embeddedName } from "@/lib/satis-takibi"

export const metadata = { title: "Satış Takibi — KoçUp" }

export default async function SatisTakibiPage() {
  const supabase = await createClient()

  const nowIso = new Date().toISOString()
  const [{ data: leads }, { data: upcomingDemos }, { data: setters }, { data: allDemos }] =
    await Promise.all([
      supabase
        .from("sales_leads")
        .select("*")
        .order("sonraki_adim_tarihi", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("demo_appointments")
        .select("lead_id, scheduled_at, set_by_id, setter:demo_setters(name)")
        .eq("status", "scheduled")
        .gte("scheduled_at", nowIso)
        .order("scheduled_at", { ascending: true }),
      supabase.from("demo_setters").select("id, name").eq("is_active", true).order("name"),
      supabase.from("demo_appointments").select("set_by_id"),
    ])

  // Kurum başına bir sonraki yaklaşan demo (en erken) — ayarlayan adıyla.
  const nextDemoByLead: Record<
    string,
    { scheduled_at: string; setterId: string | null; setterName: string | null }
  > = {}
  for (const d of upcomingDemos ?? []) {
    if (d.lead_id in nextDemoByLead) continue
    nextDemoByLead[d.lead_id] = {
      scheduled_at: d.scheduled_at,
      setterId: d.set_by_id,
      setterName: embeddedName(d.setter),
    }
  }

  // Ayarlayan başına toplam demo sayısı (kim kaç demo bağladı).
  const countBySetter: Record<string, number> = {}
  for (const d of allDemos ?? []) {
    if (d.set_by_id) countBySetter[d.set_by_id] = (countBySetter[d.set_by_id] ?? 0) + 1
  }
  const setterOptions = (setters ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    count: countBySetter[s.id] ?? 0,
  }))

  return (
    <div className="max-w-6xl mx-auto">
      <SatisTakibiView
        leads={leads ?? []}
        nextDemoByLead={nextDemoByLead}
        setterOptions={setterOptions}
      />
    </div>
  )
}
