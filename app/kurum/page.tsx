import { UserCog, GraduationCap, Activity, BookOpen } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth/current-user"

export const metadata = { title: "Kurum Paneli — KoçUp" }

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default async function KurumDashboard() {
  const profile = await getCurrentProfile()
  const orgId = profile!.organization_id!

  const supabase = await createClient()

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const sevenDaysAgoStr = isoDate(sevenDaysAgo)

  const [
    { data: organization },
    { data: coachProfiles },
    { count: studentCount },
    { data: weekSessions },
  ] = await Promise.all([
    supabase.from("organizations").select("name, plan").eq("id", orgId).maybeSingle(),
    supabase
      .from("profiles")
      .select("id")
      .eq("organization_id", orgId)
      .eq("role", "coach"),
    supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("is_active", true),
    supabase
      .from("study_sessions")
      .select("total_questions, student_id, students!inner(organization_id)")
      .eq("students.organization_id", orgId)
      .gte("date", sevenDaysAgoStr),
  ])

  const coachCount = (coachProfiles ?? []).length
  const weekTotal = (weekSessions ?? []).reduce(
    (s, r) => s + (r.total_questions ?? 0),
    0,
  )

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900">
          {organization?.name ?? "Kurum"}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Kurum koçlarını ve öğrencilerini buradan yönet.{" "}
          {organization?.plan && (
            <span className="ml-1 inline-block rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[11px] font-medium capitalize">
              {organization.plan}
            </span>
          )}
        </p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<UserCog className="h-4 w-4" />}
          label="Koç"
          value={coachCount}
          tone="bg-blue-50 text-blue-700"
        />
        <StatCard
          icon={<GraduationCap className="h-4 w-4" />}
          label="Aktif Öğrenci"
          value={studentCount ?? 0}
          tone="bg-green-50 text-green-700"
        />
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Bu Hafta Soru"
          value={weekTotal.toLocaleString("tr-TR")}
          tone="bg-purple-50 text-purple-700"
        />
        <StatCard
          icon={<BookOpen className="h-4 w-4" />}
          label="Plan"
          value={organization?.plan ?? "—"}
          tone="bg-orange-50 text-[#F97316]"
        />
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-zinc-900 mb-2">Hoş geldiniz 👋</h2>
        <p className="text-sm text-zinc-600">
          Kurum paneline hoş geldiniz. Sol menüden koçlarınızı yönetebilir, kurum
          öğrencilerini görüntüleyebilir ve marka ayarlarınızı güncelleyebilirsiniz.
          Detaylı analitik yakında bu panele entegre edilecek.
        </p>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  tone: string
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-zinc-500">{label}</span>
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${tone}`}>
          {icon}
        </span>
      </div>
      <div className="text-2xl font-bold text-zinc-900 tabular-nums">{value}</div>
    </div>
  )
}
