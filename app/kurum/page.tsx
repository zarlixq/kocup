import Link from "next/link"
import { UserCog, GraduationCap, Activity, BookOpenCheck, ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth/current-user"
import { ApplicationStatusDonut } from "@/components/charts/application-status-donut"
import { StudentLeaderboard, type LeaderboardRow } from "@/components/mudur/student-leaderboard"
import { getScoreboardStats } from "@/lib/analytics/scoreboard"
import {
  activitySegment,
  ACTIVITY_SEGMENT_META,
  ACTIVITY_SEGMENT_ORDER,
  ACTIVITY_SEGMENT_WINDOW_DAYS,
  type ActivitySegment,
} from "@/lib/analytics/scoreboard"
import { getWeeklyComplianceMap } from "@/lib/analytics/compliance"
import { mergeDashboardPrefs } from "@/lib/analytics/ui-preferences"
import { getUiPreference } from "@/lib/analytics/ui-preferences-actions"

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
    { data: orgStudents },
    { data: studentProfiles },
    { data: weekSessions },
    scoreStats30,
    scoreStats7,
    complianceMap,
    dashPrefsRaw,
  ] = await Promise.all([
    supabase.from("organizations").select("name, plan").eq("id", orgId).maybeSingle(),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("organization_id", orgId)
      .eq("role", "coach"),
    supabase
      .from("students")
      .select("id, grade, coach_id, is_active")
      .eq("organization_id", orgId),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("organization_id", orgId)
      .eq("role", "student"),
    supabase
      .from("study_sessions")
      .select("total_questions, student_id, students!inner(organization_id)")
      .eq("students.organization_id", orgId)
      .gte("date", sevenDaysAgoStr),
    getScoreboardStats(supabase),
    getScoreboardStats(supabase, ACTIVITY_SEGMENT_WINDOW_DAYS),
    getWeeklyComplianceMap(supabase),
    getUiPreference("kurum_dashboard"),
  ])

  const coaches = coachProfiles ?? []
  const students = orgStudents ?? []
  const coachCount = coaches.length
  const totalStudents = students.length
  const activeStudentCount = students.filter((s) => s.is_active).length
  const passiveStudentCount = totalStudents - activeStudentCount
  const weekTotal = (weekSessions ?? []).reduce((s, r) => s + (r.total_questions ?? 0), 0)

  const dashPrefs = mergeDashboardPrefs(dashPrefsRaw)

  // ── Leaderboard verisi (kapsam RLS ile yalnız bu kurum) ──────────────────
  const nameById = new Map((studentProfiles ?? []).map((p) => [p.id, p.full_name]))
  const coachNameById = new Map(coaches.map((c) => [c.id, c.full_name]))
  const studentMetaById = new Map(students.map((s) => [s.id, s]))

  const leaderboardRows: LeaderboardRow[] = scoreStats30
    .filter((s) => {
      const meta = studentMetaById.get(s.student_id)
      return !!meta && meta.is_active !== false
    })
    .map((s) => {
      const meta = studentMetaById.get(s.student_id)
      const comp = complianceMap.get(s.student_id)
      return {
        ...s,
        name: nameById.get(s.student_id) ?? "—",
        grade: (meta?.grade as string | null) ?? null,
        coachName: meta?.coach_id ? coachNameById.get(meta.coach_id) ?? null : null,
        compliance: comp
          ? { percent: comp.percent, totalItems: comp.totalItems, doneItems: comp.doneItems }
          : null,
      }
    })

  // ── Aktiflik durumu dağılımı (aktif / az aktif / pasif) — aktif öğrenciler ─
  const activeDays7ById = new Map(scoreStats7.map((s) => [s.student_id, s.active_days]))
  const segmentCounts: Record<ActivitySegment, number> = { active: 0, low: 0, inactive: 0 }
  for (const s of students) {
    if (!s.is_active) continue
    const seg = activitySegment(activeDays7ById.get(s.id) ?? 0)
    segmentCounts[seg] += 1
  }
  const distributionData = ACTIVITY_SEGMENT_ORDER.map((k) => ({
    name: ACTIVITY_SEGMENT_META[k].label,
    value: segmentCounts[k],
    color: ACTIVITY_SEGMENT_META[k].color,
  })).filter((d) => d.value > 0)

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            {organization?.name ?? "Kurum"}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Kurum koçlarını ve öğrencilerini buradan izle.{" "}
            {organization?.plan && (
              <span className="ml-1 inline-block rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[11px] font-medium capitalize">
                {organization.plan}
              </span>
            )}
          </p>
        </div>
        <Link
          href="/kurum/analitik"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1B6B8A] hover:underline"
        >
          Koç aktiflik paneli
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
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
          label="Toplam Öğrenci"
          value={totalStudents}
          sub={`${activeStudentCount} aktif · ${passiveStudentCount} pasif`}
          tone="bg-green-50 text-green-700"
        />
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Aktif Öğrenci"
          value={activeStudentCount}
          tone="bg-purple-50 text-purple-700"
        />
        <StatCard
          icon={<BookOpenCheck className="h-4 w-4" />}
          label="Bu Hafta Soru"
          value={weekTotal.toLocaleString("tr-TR")}
          sub="Son 7 gün"
          tone="bg-orange-50 text-[#F97316]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <StudentLeaderboard
            rows={leaderboardRows}
            initialPrefs={dashPrefs}
            hrefPrefix="/kurum/ogrenciler"
            prefScope="kurum_dashboard"
          />
        </div>
        <ApplicationStatusDonut
          data={distributionData}
          title="Öğrenci Aktiflik Dağılımı"
          emptyText="Aktif öğrenci verisi yok"
        />
      </div>

      <p className="text-xs text-zinc-500">
        Aktiflik dağılımı son {ACTIVITY_SEGMENT_WINDOW_DAYS} gündeki aktif gün sayısına göre
        hesaplanır: Aktif (≥4 gün), Az Aktif (1–3 gün), Pasif (0 gün). Yalnız aktif öğrenciler
        dahildir.
      </p>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
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
      {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
    </div>
  )
}
