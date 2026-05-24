import Link from "next/link"
import { UserCog, GraduationCap, Clock, BookOpenCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { StatsCard } from "@/components/mudur/stats-card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { SystemQuestionsTrend } from "@/components/charts/system-questions-trend"
import { CoachStudentsBar } from "@/components/charts/coach-students-bar"
import { ApplicationStatusDonut } from "@/components/charts/application-status-donut"
import { ActiveStudentsArea } from "@/components/charts/active-students-area"

export const metadata = { title: "Müdür Paneli — KoçUp" }

const STATUS_LABEL: Record<string, { label: string; variant: "pending" | "paid" | "inactive" | "partial" }> = {
  pending: { label: "Bekliyor", variant: "pending" },
  tanitim_planlandi: { label: "Tanıtım Planlandı", variant: "partial" },
  tanitim_tamamlandi: { label: "Tanıtım Tamamlandı", variant: "partial" },
  approved: { label: "Onaylandı", variant: "paid" },
  rejected: { label: "Reddedildi", variant: "inactive" },
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

const MONTH_NAMES = [
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
]

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export default async function MudurDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const sevenDaysAgoStr = isoDate(sevenDaysAgo)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  const thirtyDaysAgoStr = isoDate(thirtyDaysAgo)
  const monthStartIso = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const [
    { data: profile },
    { count: coachCount },
    { count: studentCount },
    { count: pendingCount },
    { data: weekSessions },
    { data: recentApps },
    { data: trendSessions },
    { data: coaches },
    { data: activeStudents },
    { data: monthApps },
    { data: allStudents },
  ] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user!.id).maybeSingle(),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "coach"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
    supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("study_sessions").select("total_questions").gte("date", sevenDaysAgoStr),
    supabase
      .from("applications")
      .select("id, full_name, email, created_at, status")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("study_sessions")
      .select("date, total_questions")
      .gte("date", thirtyDaysAgoStr),
    supabase.from("profiles").select("id, full_name").eq("role", "coach"),
    supabase.from("students").select("coach_id, is_active").eq("is_active", true),
    supabase
      .from("applications")
      .select("status")
      .gte("created_at", monthStartIso),
    supabase.from("students").select("created_at, is_active"),
  ])

  const weekTotal = (weekSessions ?? []).reduce((sum, row) => sum + (row.total_questions ?? 0), 0)

  // System questions trend (30 gün)
  const trendByDay: Record<string, number> = {}
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo)
    d.setDate(thirtyDaysAgo.getDate() + i)
    trendByDay[isoDate(d)] = 0
  }
  for (const s of trendSessions ?? []) {
    if (trendByDay[s.date] !== undefined) {
      trendByDay[s.date] += s.total_questions ?? 0
    }
  }
  const systemTrendData = Object.entries(trendByDay).map(([date, total]) => ({ date, total }))

  // Koç başına aktif öğrenci
  const studentsByCoach = new Map<string, number>()
  for (const s of activeStudents ?? []) {
    if (!s.coach_id) continue
    studentsByCoach.set(s.coach_id, (studentsByCoach.get(s.coach_id) ?? 0) + 1)
  }
  const coachStudentsData = (coaches ?? [])
    .map((c) => ({ coach: c.full_name, count: studentsByCoach.get(c.id) ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Bu ay başvuru durumları
  const monthCounts: Record<string, number> = {}
  for (const a of monthApps ?? []) {
    monthCounts[a.status] = (monthCounts[a.status] ?? 0) + 1
  }
  const appStatusData = [
    { name: "Onaylandı", value: monthCounts["approved"] ?? 0, color: "#10b981" },
    { name: "Tanıtım Planlandı", value: monthCounts["tanitim_planlandi"] ?? 0, color: "#F97316" },
    { name: "Tanıtım Tamamlandı", value: monthCounts["tanitim_tamamlandi"] ?? 0, color: "#1B6B8A" },
    { name: "Bekliyor", value: monthCounts["pending"] ?? 0, color: "#a855f7" },
    { name: "Reddedildi", value: monthCounts["rejected"] ?? 0, color: "#ef4444" },
  ].filter((d) => d.value > 0)

  // Aktif öğrenci son 6 ay (kümülatif, ay sonu itibariyle)
  const activeStudentsData: { month: string; count: number }[] = []
  for (let i = 0; i < 6; i++) {
    const monthDate = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + i, 1)
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)
    const count = (allStudents ?? []).filter((s) => {
      if (!s.created_at) return false
      return new Date(s.created_at) < monthEnd && s.is_active
    }).length
    activeStudentsData.push({
      month: MONTH_NAMES[monthDate.getMonth()],
      count,
    })
  }

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">
          Merhaba, {profile?.full_name}
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Yönetim paneline hoş geldiniz.</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          icon={UserCog}
          color="blue"
          title="Toplam Koç"
          value={coachCount ?? 0}
          subtitle="Aktif"
        />
        <StatsCard
          icon={GraduationCap}
          color="green"
          title="Toplam Öğrenci"
          value={studentCount ?? 0}
          subtitle="Kayıtlı"
        />
        <StatsCard
          icon={Clock}
          color="orange"
          title="Bekleyen Başvuru"
          value={pendingCount ?? 0}
          subtitle="Başvuruları görüntüle →"
          href="/mudur/basvurular"
        />
        <StatsCard
          icon={BookOpenCheck}
          color="purple"
          title="Bu Hafta Soru"
          value={weekTotal.toLocaleString("tr-TR")}
          subtitle="Son 7 gün"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SystemQuestionsTrend data={systemTrendData} />
        <ActiveStudentsArea data={activeStudentsData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <CoachStudentsBar data={coachStudentsData} />
        <ApplicationStatusDonut data={appStatusData} />
      </div>

      <section className="bg-white border border-zinc-200 rounded-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-900">Son Başvurular</h2>
          <Link
            href="/mudur/basvurular"
            className="text-sm font-medium text-[#1B6B8A] hover:underline"
          >
            Tümünü Gör →
          </Link>
        </div>

        {!recentApps || recentApps.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            Henüz başvuru yok.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad Soyad</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead className="text-right">Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentApps.map((app) => {
                const s = STATUS_LABEL[app.status] ?? STATUS_LABEL.pending
                return (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium text-zinc-900">{app.full_name}</TableCell>
                    <TableCell className="text-zinc-600">{app.email}</TableCell>
                    <TableCell className="text-zinc-600">
                      {app.created_at ? formatDate(app.created_at) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  )
}
