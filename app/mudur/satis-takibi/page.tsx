import { createClient } from "@/lib/supabase/server"
import { SatisTakibiView } from "@/components/mudur/satis-takibi/satis-takibi-view"
import type { FollowUpItem } from "@/components/mudur/satis-takibi/follow-up-list"
import {
  embeddedName,
  computeDemoDisplayKey,
  KAPALI_DURUMLAR,
  type Durum,
  type RowDemo,
} from "@/lib/satis-takibi"

export const metadata = { title: "Satış Takibi — KoçUp" }

export default async function SatisTakibiPage() {
  const supabase = await createClient()

  const [{ data: leads }, { data: demos }, { data: setters }] = await Promise.all([
    supabase
      .from("sales_leads")
      .select("*")
      .order("sonraki_adim_tarihi", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("demo_appointments")
      .select("id, lead_id, scheduled_at, status, set_by_id, setter:demo_setters(name)")
      .order("scheduled_at", { ascending: true }),
    supabase.from("demo_setters").select("id, name").eq("is_active", true).order("name"),
  ])

  const nowMs = new Date().getTime()
  const durumByLead = new Map((leads ?? []).map((l) => [l.id, l.durum as Durum]))
  const kurumAdiByLead = new Map((leads ?? []).map((l) => [l.id, l.kurum_adi]))

  // Kurum başına demoları grupla (scheduled_at artan sıralı geldi)
  const demosByLead = new Map<string, typeof demos>()
  for (const d of demos ?? []) {
    const arr = demosByLead.get(d.lead_id) ?? []
    arr.push(d)
    demosByLead.set(d.lead_id, arr)
  }

  // "Satırın demosu": yaklaşan (gelecek scheduled, en erken) yoksa en son (herhangi) demo.
  const rowDemoByLead: Record<string, RowDemo> = {}
  // Takip edilmesi gerekenler: demo yaşam döngüsüne göre (lead status'e DEĞİL).
  const followUpItems: FollowUpItem[] = []

  for (const [leadId, arr] of demosByLead) {
    const list = arr ?? []
    const upcoming = list.find(
      (d) => d.status === "scheduled" && new Date(d.scheduled_at).getTime() >= nowMs,
    )
    const rowDemo = upcoming ?? list[list.length - 1] // en son (scheduled_at artan sıralı)
    if (rowDemo) {
      rowDemoByLead[leadId] = {
        id: rowDemo.id,
        scheduledAt: rowDemo.scheduled_at,
        displayKey: computeDemoDisplayKey(rowDemo.status, rowDemo.scheduled_at, nowMs),
        setById: rowDemo.set_by_id,
        setterName: embeddedName(rowDemo.setter),
      }
    }

    // Kapalı kurumlar (kazanıldı/kaybedildi) takip gerektirmez
    const durum = durumByLead.get(leadId)
    if (durum && KAPALI_DURUMLAR.includes(durum)) continue

    for (const d of list) {
      const past = new Date(d.scheduled_at).getTime() < nowMs
      // a) Sonuç bekliyor: geçmiş ama hâlâ 'scheduled'
      // b) Gelmedi: 'no_show' (reschedule edilince eski kayıt 'rescheduled' olur → burada değil)
      const kind: "awaiting" | "no_show" | null =
        d.status === "scheduled" && past ? "awaiting" : d.status === "no_show" ? "no_show" : null
      if (!kind) continue
      followUpItems.push({
        leadId,
        kurumAdi: kurumAdiByLead.get(leadId) ?? "Kurum",
        demoId: d.id,
        scheduledAt: d.scheduled_at,
        kind,
        setById: d.set_by_id,
        setterName: embeddedName(d.setter),
      })
    }
  }

  // Takip listesini zamana göre sırala (en eski önce — en acil)
  followUpItems.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))

  // Ayarlayan başına toplam demo sayısı (kim kaç demo bağladı) + filtre seçenekleri
  const countBySetter: Record<string, number> = {}
  for (const d of demos ?? []) {
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
        rowDemoByLead={rowDemoByLead}
        followUpItems={followUpItems}
        setterOptions={setterOptions}
      />
    </div>
  )
}
