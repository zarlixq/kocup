import { Wallet, TrendingUp, Calendar, Package } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { formatTRY } from "@/lib/format"
import { currentPeriodMonthISO } from "@/lib/payments"
import { CoachRevenueChart } from "@/components/mudur/finans-chart"

export const metadata = { title: "Finans — KoçUp" }

export default async function FinansPage() {
  const supabase = await createClient()
  const periodIso = currentPeriodMonthISO()

  const [{ data: payments }, { data: students }, { data: coaches }, { count: activePackageCount }] =
    await Promise.all([
      supabase.from("payments").select("amount, period_month, student_id"),
      supabase.from("students").select("id, coach_id"),
      supabase.from("profiles").select("id, full_name").eq("role", "coach").order("full_name"),
      supabase.from("packages").select("*", { count: "exact", head: true }).eq("status", "active"),
    ])

  // student_id → coach_id map
  const coachByStudent: Record<string, string | null> = {}
  for (const s of students ?? []) coachByStudent[s.id] = s.coach_id

  // coach_id → full_name map
  const coachName: Record<string, string> = {}
  for (const c of coaches ?? []) coachName[c.id] = c.full_name

  // Toplam + bu ay
  const totalCollected = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const monthCollected = (payments ?? [])
    .filter((p) => p.period_month === periodIso)
    .reduce((s, p) => s + Number(p.amount), 0)

  // Koç bazlı tahsilat
  const byCoach: Record<string, number> = {}
  for (const p of payments ?? []) {
    const cid = coachByStudent[p.student_id]
    if (!cid) continue
    byCoach[cid] = (byCoach[cid] ?? 0) + Number(p.amount)
  }

  const chartData = (coaches ?? [])
    .map((c) => ({ coach: c.full_name, amount: byCoach[c.id] ?? 0 }))
    .sort((a, b) => b.amount - a.amount)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Finans</h1>
        <p className="text-sm text-zinc-500 mt-1">Tüm koçların tahsilat özetleri.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Toplam Tahsilat"
          value={formatTRY(totalCollected)}
          color="bg-green-50 text-green-700"
        />
        <StatCard
          icon={<Calendar className="h-4 w-4" />}
          label="Bu Ay Tahsilat"
          value={formatTRY(monthCollected)}
          color="bg-blue-50 text-blue-700"
        />
        <StatCard
          icon={<Package className="h-4 w-4" />}
          label="Aktif Paket"
          value={String(activePackageCount ?? 0)}
          color="bg-purple-50 text-purple-700"
        />
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          label="Koç Sayısı"
          value={String((coaches ?? []).length)}
          color="bg-orange-50 text-[#F97316]"
        />
      </div>

      <CoachRevenueChart data={chartData} />
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-zinc-500">{label}</div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
      </div>
      <div className="text-2xl font-bold text-zinc-900 tabular-nums">{value}</div>
    </div>
  )
}
