import Link from "next/link"
import { Users, GraduationCap, Activity, Calendar, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { StatCard } from "@/components/koc/stat-card"
import { Button } from "@/components/ui/button"
import { TodaysAppointmentsCard } from "@/components/randevu/todays-appointments-card"
import {
  StudentCardGrid,
  type StudentCardRow,
} from "@/components/koc/student-card-grid"
import { istanbulDayRange, istanbulWeekStartStr } from "@/lib/tz"

export const metadata = { title: "Dashboard — KoçUp" }

function maxIso(a: string | null, b: string | null): string | null {
  if (!a) return b
  if (!b) return a
  return a > b ? a : b
}

export default async function KocDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Tarih sınırları — Istanbul takvimine göre (sunucu UTC olsa da doğru gün).
  const { start: todayStart, end: todayEnd } = istanbulDayRange()

  // Bu hafta (Pzt - Paz), Istanbul takvimi
  const weekStartIso = istanbulWeekStartStr()

  const [
    { data: students },
    { data: todaysAppts },
    { data: weekSessions },
    { data: topicsAll },
    { data: examsAll },
  ] = await Promise.all([
    supabase
      .from("students")
      .select("id, is_active, grade")
      .eq("coach_id", user!.id),
    supabase
      .from("appointments")
      .select("id, title, type, start_time, end_time, meeting_link, student_id, application_id")
      .eq("coach_id", user!.id)
      .neq("status", "iptal")
      .gte("start_time", todayStart.toISOString())
      .lt("start_time", todayEnd.toISOString())
      .order("start_time", { ascending: true }),
    // koçun bütün öğrencilerinin bu haftaki çalışmaları — student_id'leri sonra eşleyeceğiz
    supabase
      .from("study_sessions")
      .select("student_id, date, total_questions")
      .gte("date", weekStartIso),
    supabase
      .from("student_topics")
      .select("student_id, status"),
    supabase
      .from("exams")
      .select("student_id, date"),
  ])

  const studentRows = students ?? []
  const studentIds = studentRows.map((s) => s.id)
  const studentIdSet = new Set(studentIds)
  const activeStudentIds = studentRows.filter((s) => s.is_active).map((s) => s.id)

  // Profilleri ayrı çek (koç'a atanmış öğrenciler için)
  const { data: profiles } = studentIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email, first_login_at")
        .in("id", studentIds)
    : { data: [] as Array<{ id: string; full_name: string; email: string; first_login_at: string | null }> }
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))

  // Bugünkü randevulardaki kişi adlarını çek
  const todayStudentIds = Array.from(
    new Set((todaysAppts ?? []).map((a) => a.student_id).filter(Boolean) as string[]),
  )
  const todayAppIds = Array.from(
    new Set((todaysAppts ?? []).map((a) => a.application_id).filter(Boolean) as string[]),
  )

  const [{ data: todayStudents }, { data: todayApps }] = await Promise.all([
    todayStudentIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", todayStudentIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    todayAppIds.length
      ? supabase.from("applications").select("id, full_name").in("id", todayAppIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ])

  const todayPersonName = (a: { student_id: string | null; application_id: string | null }) => {
    if (a.student_id) {
      return todayStudents?.find((p) => p.id === a.student_id)?.full_name ?? null
    }
    if (a.application_id) {
      const app = todayApps?.find((p) => p.id === a.application_id)
      return app ? `${app.full_name} (Tanıtım)` : null
    }
    return null
  }

  const todaysFormatted = (todaysAppts ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    type: a.type,
    start_time: a.start_time,
    end_time: a.end_time,
    meeting_link: a.meeting_link,
    otherPersonName: todayPersonName(a),
  }))

  // Stat kartları — bu hafta toplam soru (koç öğrencileri)
  const weekTotalQuestions = (weekSessions ?? [])
    .filter((s) => studentIdSet.has(s.student_id))
    .reduce((sum, s) => sum + (s.total_questions ?? 0), 0)

  // Yaklaşan randevu sayısı (bugün + yarın)
  const upcomingEnd = new Date(todayStart.getTime() + 2 * 24 * 60 * 60 * 1000)
  const { count: upcomingCount } = await supabase
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .eq("coach_id", user!.id)
    .neq("status", "iptal")
    .gte("start_time", todayStart.toISOString())
    .lt("start_time", upcomingEnd.toISOString())

  // Öğrenci başına aggregasyon
  const weekQByStudent = new Map<string, number>()
  for (const s of weekSessions ?? []) {
    if (!studentIdSet.has(s.student_id)) continue
    weekQByStudent.set(
      s.student_id,
      (weekQByStudent.get(s.student_id) ?? 0) + (s.total_questions ?? 0),
    )
  }

  const totalTopicsByStudent = new Map<string, number>()
  const completedTopicsByStudent = new Map<string, number>()
  for (const t of topicsAll ?? []) {
    if (!studentIdSet.has(t.student_id)) continue
    totalTopicsByStudent.set(t.student_id, (totalTopicsByStudent.get(t.student_id) ?? 0) + 1)
    if (t.status === "tamam") {
      completedTopicsByStudent.set(
        t.student_id,
        (completedTopicsByStudent.get(t.student_id) ?? 0) + 1,
      )
    }
  }

  // Son aktivite — study_session date veya exam date max
  const lastSessionByStudent = new Map<string, string>()
  for (const s of weekSessions ?? []) {
    if (!studentIdSet.has(s.student_id)) continue
    const prev = lastSessionByStudent.get(s.student_id) ?? null
    const next = maxIso(prev, s.date)
    if (next) lastSessionByStudent.set(s.student_id, next)
  }
  const lastExamByStudent = new Map<string, string>()
  for (const e of examsAll ?? []) {
    if (!studentIdSet.has(e.student_id)) continue
    const prev = lastExamByStudent.get(e.student_id) ?? null
    const next = maxIso(prev, e.date)
    if (next) lastExamByStudent.set(e.student_id, next)
  }

  const cardRows: StudentCardRow[] = studentRows.map((s) => {
    const profile = profileById.get(s.id)
    const lastActivity = maxIso(
      lastSessionByStudent.get(s.id) ?? null,
      lastExamByStudent.get(s.id) ?? null,
    )
    return {
      id: s.id,
      fullName: profile?.full_name ?? "—",
      email: profile?.email ?? "",
      grade: s.grade,
      isActive: s.is_active,
      firstLoginAt: profile?.first_login_at ?? null,
      weekQuestions: weekQByStudent.get(s.id) ?? 0,
      totalTopics: totalTopicsByStudent.get(s.id) ?? 0,
      completedTopics: completedTopicsByStudent.get(s.id) ?? 0,
      lastActivityAt: lastActivity,
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Öğrencilerini tek bakışta yönet.
          </p>
        </div>
        <Link href="/koc/ogrenciler/yeni">
          <Button variant="accent">
            <Plus className="h-4 w-4" /> Yeni Öğrenci
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Toplam Öğrenci"
          value={String(studentRows.length)}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Aktif Öğrenci"
          value={String(activeStudentIds.length)}
          icon={<GraduationCap className="h-4 w-4" />}
          accent="green"
        />
        <StatCard
          label="Bu Hafta Soru"
          value={weekTotalQuestions.toLocaleString("tr-TR")}
          icon={<Activity className="h-4 w-4" />}
          accent="orange"
        />
        <StatCard
          label="Yaklaşan Randevu"
          value={String(upcomingCount ?? 0)}
          hint="Bugün ve yarın"
          icon={<Calendar className="h-4 w-4" />}
        />
      </div>

      <TodaysAppointmentsCard
        appointments={todaysFormatted}
        detailHref="/koc/randevular"
      />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-zinc-900">Öğrencilerim</h2>
          <Link
            href="/koc/ogrenciler"
            className="text-sm text-[#1B6B8A] hover:underline"
          >
            Tüm liste →
          </Link>
        </div>
        <StudentCardGrid students={cardRows} />
      </div>
    </div>
  )
}
