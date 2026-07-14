import Link from "next/link"
import { UserCog, GraduationCap, Clock, BookOpenCheck, CalendarClock } from "lucide-react"
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
import { DashboardOrgFilter } from "@/components/mudur/dashboard-org-filter"
import { StudentLeaderboard, type LeaderboardRow } from "@/components/mudur/student-leaderboard"
import { getScoreboardStats } from "@/lib/analytics/scoreboard"
import { getWeeklyComplianceMap } from "@/lib/analytics/compliance"
import { mergeDashboardPrefs } from "@/lib/analytics/ui-preferences"
import { getUiPreference } from "@/lib/analytics/ui-preferences-actions"
import { istanbulWeekStartStr } from "@/lib/tz"
import { formatDemoDateTime } from "@/lib/satis-takibi"

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

export default async function MudurDashboard({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>
}) {
  const sp = await searchParams
  const orgParam = sp.org ?? "all" // "all" | "bireysel" | <uuid>
  const isFiltered = orgParam !== "all"

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: orgList } = await supabase.from("organizations").select("id, name").order("name")

  // study_sessions'da organization_id kolonu yok → o kurumun öğrenci id'leriyle süzülür
  let orgStudentIds: string[] | null = null
  if (isFiltered) {
    let sidQ = supabase.from("students").select("id")
    sidQ = orgParam === "bireysel" ? sidQ.is("organization_id", null) : sidQ.eq("organization_id", orgParam)
    const { data: sids } = await sidQ
    orgStudentIds = (sids ?? []).map((s) => s.id)
  }

  const now = new Date()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const sevenDaysAgoStr = isoDate(sevenDaysAgo)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  const thirtyDaysAgoStr = isoDate(thirtyDaysAgo)
  const monthStartIso = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  // Org-aware sorgu kurucuları (organization_id kolonu olanlar)
  let coachCountQ = supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "coach")
  let studentCountQ = supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student")
  let coachesQ = supabase.from("profiles").select("id, full_name").eq("role", "coach")
  let activeStudentsQ = supabase.from("students").select("coach_id, is_active").eq("is_active", true)
  let allStudentsQ = supabase.from("students").select("created_at, is_active")
  if (orgParam === "bireysel") {
    coachCountQ = coachCountQ.is("organization_id", null)
    studentCountQ = studentCountQ.is("organization_id", null)
    coachesQ = coachesQ.is("organization_id", null)
    activeStudentsQ = activeStudentsQ.is("organization_id", null)
    allStudentsQ = allStudentsQ.is("organization_id", null)
  } else if (isFiltered) {
    coachCountQ = coachCountQ.eq("organization_id", orgParam)
    studentCountQ = studentCountQ.eq("organization_id", orgParam)
    coachesQ = coachesQ.eq("organization_id", orgParam)
    activeStudentsQ = activeStudentsQ.eq("organization_id", orgParam)
    allStudentsQ = allStudentsQ.eq("organization_id", orgParam)
  }

  // study_sessions: org öğrenci id'leriyle süzme (filtre yoksa global)
  let weekSessionsQ = supabase.from("study_sessions").select("total_questions").gte("date", sevenDaysAgoStr)
  let trendSessionsQ = supabase.from("study_sessions").select("date, total_questions").gte("date", thirtyDaysAgoStr)
  if (orgStudentIds) {
    weekSessionsQ = weekSessionsQ.in("student_id", orgStudentIds)
    trendSessionsQ = trendSessionsQ.in("student_id", orgStudentIds)
  }

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
    coachCountQ,
    studentCountQ,
    // Başvurular B2C lead hunisidir (kurum kolonu yok) → her zaman platform geneli
    supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
    weekSessionsQ,
    supabase
      .from("applications")
      .select("id, full_name, email, created_at, status")
      .order("created_at", { ascending: false })
      .limit(5),
    trendSessionsQ,
    coachesQ,
    activeStudentsQ,
    supabase
      .from("applications")
      .select("status")
      .gte("created_at", monthStartIso),
    allStudentsQ,
  ])

  const weekTotal = (weekSessions ?? []).reduce((sum, row) => sum + (row.total_questions ?? 0), 0)

  // ── Öğrenci sıralaması (leaderboard) verisi — kapsam RLS ile tüm platform ──
  const dashPrefs = mergeDashboardPrefs(await getUiPreference("mudur_dashboard"))
  const [scoreStats, complianceMap, { data: leaderStudents }, { data: leaderNames }, { data: leaderCoaches }] =
    await Promise.all([
      getScoreboardStats(supabase),
      getWeeklyComplianceMap(supabase),
      supabase.from("students").select("id, grade, coach_id, is_active"),
      supabase.from("profiles").select("id, full_name").eq("role", "student"),
      supabase.from("profiles").select("id, full_name").eq("role", "coach"),
    ])

  const nameById = new Map((leaderNames ?? []).map((p) => [p.id, p.full_name]))
  const coachNameById = new Map((leaderCoaches ?? []).map((c) => [c.id, c.full_name]))
  const studentMetaById = new Map(
    (leaderStudents ?? []).map((s) => [s.id, s]),
  )
  // Bu haftaki planlı demolar (satış CRM) — zamana göre sıralı
  const weekStartStr = istanbulWeekStartStr()
  const weekEndIso = new Date(
    new Date(`${weekStartStr}T00:00:00+03:00`).getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString()
  const { data: weekDemos } = await supabase
    .from("demo_appointments")
    .select("id, scheduled_at, lead_id, sales_leads(kurum_adi)")
    .eq("status", "scheduled")
    .gte("scheduled_at", now.toISOString())
    .lt("scheduled_at", weekEndIso)
    .order("scheduled_at", { ascending: true })
    .limit(8)

  // Org filtresi uygulandıysa yalnız o kapsamdaki öğrencileri sırala
  const scopeSet = orgStudentIds ? new Set(orgStudentIds) : null
  const leaderboardRows: LeaderboardRow[] = scoreStats
    .filter((s) => {
      const meta = studentMetaById.get(s.student_id)
      if (!meta || meta.is_active === false) return false
      if (scopeSet && !scopeSet.has(s.student_id)) return false
      return true
    })
    .map((s) => {
      const meta = studentMetaById.get(s.student_id)
      const comp = complianceMap.get(s.student_id)
      return {
        ...s,
        name: nameById.get(s.student_id) ?? "—",
        grade: meta?.grade ?? null,
        coachName: meta?.coach_id ? coachNameById.get(meta.coach_id) ?? null : null,
        compliance: comp
          ? { percent: comp.percent, totalItems: comp.totalItems, doneItems: comp.doneItems }
          : null,
      }
    })

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
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            Merhaba, {profile?.full_name}
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Yönetim paneline hoş geldiniz.</p>
        </div>
        <DashboardOrgFilter current={orgParam} orgs={orgList ?? []} />
      </header>

      {isFiltered && (
        <p className="-mt-2 mb-6 text-xs text-zinc-500">
          Kurum filtresi uygulandı. Başvuru metrikleri (bekleyen / son başvurular) tüm platform genelindedir.
        </p>
      )}

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

      <div className="mb-8">
        <StudentLeaderboard rows={leaderboardRows} initialPrefs={dashPrefs} />
      </div>

      {(weekDemos ?? []).length > 0 && (
        <section className="bg-white border border-zinc-200 rounded-2xl mb-8">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <CalendarClock className="h-4 w-4" />
              </span>
              <h2 className="font-semibold text-zinc-900">Bu Hafta Demolar</h2>
            </div>
            <Link href="/mudur/satis-takibi" className="text-sm font-medium text-[#1B6B8A] hover:underline">
              Satış Takibi →
            </Link>
          </div>
          <ul className="divide-y divide-zinc-100">
            {(weekDemos ?? []).map((d) => {
              const rel = d.sales_leads as { kurum_adi: string } | { kurum_adi: string }[] | null
              const kurumAdi = Array.isArray(rel) ? rel[0]?.kurum_adi : rel?.kurum_adi
              return (
                <li key={d.id}>
                  <Link
                    href={`/mudur/satis-takibi/${d.lead_id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 transition-colors"
                  >
                    <span className="font-medium text-zinc-900 truncate">{kurumAdi ?? "Kurum"}</span>
                    <span className="text-sm font-medium text-indigo-700 whitespace-nowrap tabular-nums">
                      {formatDemoDateTime(d.scheduled_at)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

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
