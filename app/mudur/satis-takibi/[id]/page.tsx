import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, MapPin, Phone, User2, Users, Tag } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { DurumBadge } from "@/components/mudur/satis-takibi/durum-badge"
import { DemoAppointmentsPanel } from "@/components/mudur/satis-takibi/demo-appointments-panel"
import {
  KURUM_TIPI_LABEL,
  type Durum,
  type DemoAppointmentWithSetter,
} from "@/lib/satis-takibi"

export const metadata = { title: "Kurum Detayı — Satış Takibi" }

export default async function SatisLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: lead }, { data: demos }, { data: setters }] = await Promise.all([
    supabase.from("sales_leads").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("demo_appointments")
      .select("*, setter:demo_setters(name)")
      .eq("lead_id", id)
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("demo_setters")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
  ])

  if (!lead) notFound()

  const appointments = (demos ?? []) as DemoAppointmentWithSetter[]
  const setterOptions = (setters ?? []).map((s) => ({ id: s.id, name: s.name }))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/mudur/satis-takibi"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Satış takibi listesi
      </Link>

      <div className="bg-white border border-zinc-200 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-zinc-900">{lead.kurum_adi}</h1>
              <DurumBadge durum={lead.durum as Durum} />
            </div>
            <p className="text-sm text-zinc-500 mt-1">
              {KURUM_TIPI_LABEL[lead.kurum_tipi as keyof typeof KURUM_TIPI_LABEL] ?? lead.kurum_tipi}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoRow icon={<MapPin className="h-4 w-4" />} label="Konum" value={[lead.il, lead.ilce].filter(Boolean).join(" / ") || null} />
          <InfoRow icon={<User2 className="h-4 w-4" />} label="İletişim Kişisi" value={lead.iletisim_kisisi} />
          <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefon" value={lead.telefon} />
          <InfoRow icon={<Users className="h-4 w-4" />} label="Öğrenci Sayısı" value={lead.ogrenci_sayisi != null ? String(lead.ogrenci_sayisi) : null} />
          <InfoRow icon={<Tag className="h-4 w-4" />} label="Verilen Fiyat" value={lead.verilen_fiyat} />
        </div>

        {lead.notlar && (
          <div className="mt-4 pt-4 border-t border-zinc-100">
            <div className="text-xs text-zinc-500 mb-1">Notlar</div>
            <div className="text-sm text-zinc-700 whitespace-pre-line">{lead.notlar}</div>
          </div>
        )}
      </div>

      <DemoAppointmentsPanel leadId={lead.id} appointments={appointments} setters={setterOptions} />
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-zinc-500">{label}</div>
        <div className="text-sm font-medium text-zinc-900 truncate">{value || "—"}</div>
      </div>
    </div>
  )
}
