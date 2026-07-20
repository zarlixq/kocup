import Link from "next/link"
import { BarChart3, UserCog, GraduationCap, Activity, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth/current-user"
import { SystemQuestionsTrend } from "@/components/charts/system-questions-trend"
import { CoachStudentsBar } from "@/components/charts/coach-students-bar"
import {
  CoachPerformanceTable,
  type CoachPerformanceRow,
} from "@/components/kurum/coach-performance-table"
import { getUserStatus } from "@/lib/user-status"
import { getWeeklyComplianceMap } from "@/lib/analytics/compliance"

export const metadata = { title: "Analitik — Kurum" }

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default async function KurumAnalitikPage() {
  const me = await getCurrentProfile()
  const orgId = me!.organization_id!

  const supabase = await createClient()

  const now = new Date()
  const thirtyAgo = new Date(now)
  thirtyAgo.setDate(now.getDate() - 29)
  const thirtyAgoIso = isoDate(thirtyAgo)
  const thirtyAgoTime = thirtyAgo.toISOString()
  const nowIso = now.toISOString()

  // Kurum koçları
  const { data: coachProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, first_login_at")
    .eq("organization_id", orgId)
    .eq("role", "coach")

  const coaches = coachProfiles ?? []
  const coachIds = coaches.map((c) => c.id)

  // Kurum öğrencileri
  const { data: orgStudents } = await supabase
    .from("students")
    .select("id, coach_id, is_active")
    .eq("organization_id", orgId)

  const studentIds = (orgStudents ?? []).map((s) => s.id)
  const activeStudentIds = (orgStudents ?? []).filter((s) => s.is_active).map((s) => s.id)

  // Pending davetler (henüz giriş yapmamış koç)
  const pendingInvites = coaches.filter(
    (c) => getUserStatus({ first_login_at: c.first_login_at }) === "pending",
  ).length

  // Son 30 gün soru çözüm + görüşme notları + haftalık uyum + koç son giriş
  const [{ data: sessions30 }, { data: appts30 }, complianceMap, { data: lastLogins }] =
    await Promise.all([
      studentIds.length
        ? supabase
            .from("study_sessions")
            .select("date, total_questions, student_id")
            .in("student_id", studentIds)
            .gte("date", thirtyAgoIso)
        : Promise.resolve({
            data: [] as Array<{ date: string; total_questions: number; student_id: string }>,
          }),
      coachIds.length
        ? supabase
            .from("appointments")
            .select("coach_id, start_time, meeting_notes, summary, notes")
            .in("coach_id", coachIds)
            .gte("start_time", thirtyAgoTime)
            .lt("start_time", nowIso)
        : Promise.resolve({
            data: [] as Array<{
              coach_id: string
              start_time: string
              meeting_notes: string | null
              summary: string | null
              notes: string | null
            }>,
          }),
      getWeeklyComplianceMap(supabase),
      supabase.rpc("org_coach_last_login"),
    ])

  const lastLoginByCoach = new Map<string, string | null>(
    (lastLogins ?? []).map((r) => [r.coach_id, r.last_sign_in_at]),
  )

  // Sistem geneli (kurum) trend datası
  const trendByDay: Record<string, number> = {}
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyAgo)
    d.setDate(thirtyAgo.getDate() + i)
    trendByDay[isoDate(d)] = 0
  }
  for (const s of sessions30 ?? []) {
    if (trendByDay[s.date] !== undefined) {
      trendByDay[s.date] += s.total_questions ?? 0
    }
  }
  const trendData = Object.entries(trendByDay).map(([date, total]) => ({ date, total }))

  // Koç başına aktif öğrenci
  const activeByCoach = new Map<string, number>()
  for (const s of orgStudents ?? []) {
    if (!s.coach_id || !s.is_active) continue
    activeByCoach.set(s.coach_id, (activeByCoach.get(s.coach_id) ?? 0) + 1)
  }
  const coachStudentsData = coaches
    .map((c) => ({ coach: c.full_name, count: activeByCoach.get(c.id) ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Koç başına öğrenci grupları
  const studentsByCoach = new Map<string, string[]>()
  const activeStudentsByCoach = new Map<string, string[]>()
  for (const s of orgStudents ?? []) {
    if (!s.coach_id) continue
    if (!studentsByCoach.has(s.coach_id)) studentsByCoach.set(s.coach_id, [])
    studentsByCoach.get(s.coach_id)!.push(s.id)
    if (s.is_active) {
      if (!activeStudentsByCoach.has(s.coach_id)) activeStudentsByCoach.set(s.coach_id, [])
      activeStudentsByCoach.get(s.coach_id)!.push(s.id)
    }
  }

  const questionsByStudent = new Map<string, number>()
  for (const s of sessions30 ?? []) {
    questionsByStudent.set(
      s.student_id,
      (questionsByStudent.get(s.student_id) ?? 0) + (s.total_questions ?? 0),
    )
  }

  // Koç başına görüşme/geri bildirim notu (son 30 gün)
  const feedbackByCoach = new Map<string, number>()
  for (const a of appts30 ?? []) {
    const hasFeedback =
      (a.meeting_notes?.trim().length ?? 0) > 0 ||
      (a.summary?.trim().length ?? 0) > 0 ||
      (a.notes?.trim().length ?? 0) > 0
    if (!hasFeedback) continue
    feedbackByCoach.set(a.coach_id, (feedbackByCoach.get(a.coach_id) ?? 0) + 1)
  }

  // Performans / aktiflik satırları
  const performanceRows: CoachPerformanceRow[] = coaches.map((c) => {
    const totalStudents = (studentsByCoach.get(c.id) ?? []).length
    const activeIds = activeStudentsByCoach.get(c.id) ?? []
    const activeStudents = activeIds.length

    const sumQ = activeIds.reduce((s, id) => s + (questionsByStudent.get(id) ?? 0), 0)
    const avgQuestionsPerActive = activeStudents > 0 ? sumQ / activeStudents : 0

    // Haftalık program: aktif öğrenciler içinde programı olanlar + ortalama uyum
    let studentsWithProgram = 0
    const compliancePercents: number[] = []
    for (const id of activeIds) {
      const comp = complianceMap.get(id)
      if (comp) {
        studentsWithProgram += 1
        if (comp.percent !== null) compliancePercents.push(comp.percent)
      }
    }
    const weeklyComplianceAvg =
      compliancePercents.length > 0
        ? compliancePercents.reduce((s, v) => s + v, 0) / compliancePercents.length
        : null

    return {
      id: c.id,
      full_name: c.full_name,
      email: c.email,
      lastSignInAt: lastLoginByCoach.get(c.id) ?? null,
      totalStudents,
      activeStudents,
      avgQuestionsPerActive,
      studentsWithProgram,
      weeklyComplianceAvg,
      feedbackCount: feedbackByCoach.get(c.id) ?? 0,
    }
  })

  // Hiç veri yoksa boş state
  const hasAnyData =
    coaches.length > 0 ||
    (orgStudents?.length ?? 0) > 0 ||
    (sessions30?.length ?? 0) > 0

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Analitik</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Kurum düzeyinde performans göstergeleri (son 30 gün).
          </p>
        </div>
        <Link href="/kurum" className="text-sm text-[#1B6B8A] hover:underline">
          ← Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<UserCog className="h-4 w-4" />}
          label="Koç"
          value={coaches.length}
          tone="bg-blue-50 text-blue-700"
        />
        <StatCard
          icon={<GraduationCap className="h-4 w-4" />}
          label="Toplam Öğrenci"
          value={orgStudents?.length ?? 0}
          tone="bg-green-50 text-green-700"
        />
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Aktif Öğrenci"
          value={activeStudentIds.length}
          tone="bg-purple-50 text-purple-700"
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Bekleyen Davet"
          value={pendingInvites}
          tone="bg-orange-50 text-[#F97316]"
        />
      </div>

      {!hasAnyData ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="h-6 w-6 text-zinc-500" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 mb-1">Veriler birikiyor</h3>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
            Koç ve öğrencileriniz aktifleştikçe ders programları, soru çözümleri ve
            randevu istatistikleri burada görüntülenecek.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SystemQuestionsTrend
              data={trendData}
              title="Kurum Toplam Soru Çözüm — Son 30 Gün"
              emptyText="Henüz soru çözüm verisi yok"
            />
            <CoachStudentsBar
              data={coachStudentsData}
              title="Koç Başına Aktif Öğrenci"
              emptyText="Henüz öğrenci ataması yok"
            />
          </div>

          <div>
            <h2 className="text-base font-semibold text-zinc-900 mb-3">Koç Aktiflik Paneli</h2>
            <CoachPerformanceTable rows={performanceRows} />
            <p className="text-xs text-zinc-500 mt-2">
              Son giriş = koçun panele en son girişi. Ort. Soru/Aktif ve Geri Bildirim son 30 günü
              kapsar; Bu Hafta Program ve Ort. Uyum bu haftanın program maddelerinden hesaplanır.
              Geri Bildirim, görüşme/randevu notu bırakılmış randevu sayısıdır. Sıralamak için kolon
              başlığına tıkla.
            </p>
          </div>
        </>
      )}
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
  value: number | string
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
