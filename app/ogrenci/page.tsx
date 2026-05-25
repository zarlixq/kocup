import Link from "next/link"
import { BookOpen, FileText, Hash, CheckCircle2, Plus, UserCog } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/format"
import { WeeklyQuestionsChart } from "@/components/ogrenci/weekly-questions-chart"
import { SubjectRadarChart } from "@/components/charts/subject-radar-chart"
import { ExamTrendChart } from "@/components/charts/exam-trend-chart"
import { UpcomingAppointmentCard } from "@/components/randevu/upcoming-appointment-card"
import { CoachCard } from "@/components/ogrenci/coach-card"
import { WeeklyTasksCard } from "@/components/ogrenci/weekly-tasks-card"
import { buildSubjectRadarData, buildExamTrendData } from "@/lib/charts/builders"

function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export const metadata = { title: "Dashboard — KoçUp" }

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default async function OgrenciDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const studentId = user!.id

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", studentId)
    .maybeSingle()

  const { data: studentRow } = await supabase
    .from("students")
    .select("coach_id")
    .eq("id", studentId)
    .maybeSingle()

  const { data: coachProfile } = studentRow?.coach_id
    ? await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", studentRow.coach_id)
        .maybeSingle()
    : { data: null }

  const now = new Date()
  const fourteenAgo = new Date(now)
  fourteenAgo.setDate(now.getDate() - 13)
  const fromIso = isoDate(fourteenAgo)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthStartIso = isoDate(monthStart)

  const nowIso = now.toISOString()

  const [
    { data: sessions14 },
    { data: monthSessions },
    { data: topics },
    { count: examCount },
    { data: recentSessions },
    { data: recentExams },
    { data: upcomingAppt },
    radarData,
    examTrendData,
  ] = await Promise.all([
    supabase
      .from("study_sessions")
      .select("date, total_questions, correct, wrong")
      .eq("student_id", studentId)
      .gte("date", fromIso),
    supabase
      .from("study_sessions")
      .select("total_questions, correct")
      .eq("student_id", studentId)
      .gte("date", monthStartIso),
    supabase
      .from("student_topics")
      .select("status")
      .eq("student_id", studentId),
    supabase
      .from("exams")
      .select("*", { count: "exact", head: true })
      .eq("student_id", studentId),
    supabase
      .from("study_sessions")
      .select("id, date, total_questions, correct, wrong, subjects(name)")
      .eq("student_id", studentId)
      .order("date", { ascending: false })
      .limit(5),
    supabase
      .from("exams")
      .select("id, name, exam_type, date, exam_results(net)")
      .eq("student_id", studentId)
      .order("date", { ascending: false })
      .limit(3),
    supabase
      .from("appointments")
      .select("id, title, type, start_time, end_time, meeting_link, coach_id")
      .eq("student_id", studentId)
      .eq("status", "planlandi")
      .gte("start_time", nowIso)
      .order("start_time", { ascending: true })
      .limit(1)
      .maybeSingle(),
    buildSubjectRadarData(supabase, studentId),
    buildExamTrendData(supabase, studentId),
  ])

  // Hedefli atamalar + ilerlemeleri (WeeklyTasksCard için)
  const [{ data: assignments }, { data: asgProgress }] = await Promise.all([
    supabase
      .from("topic_assignments")
      .select("id, hedef_soru, son_tarih, status, topics(name, subjects(name))")
      .eq("student_id", studentId),
    supabase
      .from("study_sessions")
      .select("assignment_id, total_questions")
      .eq("student_id", studentId)
      .not("assignment_id", "is", null),
  ])

  const cozulenByAsg = new Map<string, number>()
  for (const p of asgProgress ?? []) {
    if (!p.assignment_id) continue
    cozulenByAsg.set(
      p.assignment_id,
      (cozulenByAsg.get(p.assignment_id) ?? 0) + (p.total_questions ?? 0),
    )
  }

  const weeklyTasks = (assignments ?? []).map((a) => ({
    id: a.id,
    topic_name: a.topics?.name ?? "—",
    subject_name: a.topics?.subjects?.name ?? "—",
    hedef_soru: a.hedef_soru,
    son_tarih: a.son_tarih,
    status: a.status,
    cozulen_soru: cozulenByAsg.get(a.id) ?? 0,
  }))

  // Yaklaşan randevuda koç ismini çek
  let upcomingCoachName: string | null = null
  if (upcomingAppt?.coach_id) {
    const { data: c } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", upcomingAppt.coach_id)
      .maybeSingle()
    upcomingCoachName = c?.full_name ?? null
  }

  const monthTotal = (monthSessions ?? []).reduce((s, r) => s + r.total_questions, 0)
  const monthCorrect = (monthSessions ?? []).reduce((s, r) => s + r.correct, 0)
  const completedTopics = (topics ?? []).filter((t) => t.status === "tamam").length
  const totalTopics = (topics ?? []).length

  const byDay: Record<string, { total: number; correct: number; wrong: number }> = {}
  for (let i = 0; i < 14; i++) {
    const d = new Date(fourteenAgo)
    d.setDate(fourteenAgo.getDate() + i)
    byDay[isoDate(d)] = { total: 0, correct: 0, wrong: 0 }
  }
  for (const s of sessions14 ?? []) {
    const k = s.date
    if (!byDay[k]) continue
    byDay[k].total += s.total_questions
    byDay[k].correct += s.correct
    byDay[k].wrong += s.wrong
  }
  const chartData = Object.entries(byDay).map(([k, v]) => ({
    day: k.slice(5).replace("-", "/"),
    ...v,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Merhaba, {profile?.full_name} 👋</h1>
          <p className="text-sm text-zinc-500 mt-1">Gelişimini buradan takip edebilirsin.</p>
        </div>
        {coachProfile ? (
          <Link
            href="/ogrenci/kocum"
            className="bg-white border border-zinc-200 rounded-xl px-3 py-2 flex items-center gap-3 hover:border-zinc-300 transition-colors"
          >
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-[#1B6B8A] text-white text-xs">
                {initials(coachProfile.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-zinc-500">Koçun</span>
              <span className="text-sm font-medium text-zinc-900 truncate">
                {coachProfile.full_name}
              </span>
            </div>
          </Link>
        ) : (
          <Link
            href="/ogrenci/kocum"
            className="bg-white border border-zinc-200 rounded-xl px-3 py-2 flex items-center gap-2 text-sm text-zinc-500 hover:border-zinc-300"
          >
            <UserCog className="h-4 w-4" />
            Koç atanmamış
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Hash className="h-4 w-4" />}
          label="Bu Ay Soru"
          value={monthTotal.toLocaleString("tr-TR")}
          color="bg-blue-50 text-blue-700"
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Bu Ay Doğru"
          value={monthCorrect.toLocaleString("tr-TR")}
          color="bg-green-50 text-green-700"
        />
        <StatCard
          icon={<BookOpen className="h-4 w-4" />}
          label="Tamamlanan Konu"
          value={`${completedTopics}/${totalTopics}`}
          color="bg-purple-50 text-purple-700"
        />
        <StatCard
          icon={<FileText className="h-4 w-4" />}
          label="Toplam Deneme"
          value={String(examCount ?? 0)}
          color="bg-orange-50 text-[#F97316]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CoachCard
          coach={
            coachProfile
              ? { full_name: coachProfile.full_name, email: coachProfile.email }
              : null
          }
        />
        <WeeklyTasksCard tasks={weeklyTasks} />
      </div>

      {upcomingAppt && (
        <UpcomingAppointmentCard
          appointment={{
            id: upcomingAppt.id,
            title: upcomingAppt.title,
            type: upcomingAppt.type,
            start_time: upcomingAppt.start_time,
            end_time: upcomingAppt.end_time,
            meeting_link: upcomingAppt.meeting_link,
            otherPersonName: upcomingCoachName,
          }}
          href="/ogrenci/randevularim"
        />
      )}

      <WeeklyQuestionsChart data={chartData} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SubjectRadarChart data={radarData} />
        <ExamTrendChart data={examTrendData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-zinc-900">Son Soru Çözüm</h2>
            <Link href="/ogrenci/soru-cozum/yeni">
              <Button variant="accent" size="sm">
                <Plus className="h-4 w-4" /> Yeni
              </Button>
            </Link>
          </div>
          {(recentSessions ?? []).length === 0 ? (
            <EmptyCard text="Henüz soru çözüm kaydın yok." />
          ) : (
            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Ders</TableHead>
                    <TableHead className="text-right">D</TableHead>
                    <TableHead className="text-right">Y</TableHead>
                    <TableHead className="text-right">B</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(recentSessions ?? []).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="whitespace-nowrap text-xs">{formatDate(s.date, "d MMM")}</TableCell>
                      <TableCell className="text-zinc-600">{s.subjects?.name ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums text-green-600">{s.correct}</TableCell>
                      <TableCell className="text-right tabular-nums text-red-600">{s.wrong}</TableCell>
                      <TableCell className="text-right tabular-nums text-zinc-500">
                        {s.total_questions - s.correct - s.wrong}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-zinc-900">Son Denemeler</h2>
            <Link href="/ogrenci/denemelerim/yeni">
              <Button variant="accent" size="sm">
                <Plus className="h-4 w-4" /> Yeni
              </Button>
            </Link>
          </div>
          {(recentExams ?? []).length === 0 ? (
            <EmptyCard text="Henüz deneme kaydın yok." />
          ) : (
            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Deneme</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(recentExams ?? []).map((e) => {
                    const total = (e.exam_results ?? []).reduce((s, r) => s + Number(r.net ?? 0), 0)
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="whitespace-nowrap text-xs">{formatDate(e.date, "d MMM")}</TableCell>
                        <TableCell className="font-medium text-zinc-900">{e.name}</TableCell>
                        <TableCell className="uppercase text-xs text-zinc-500">{e.exam_type.replace("_", "+")}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{total.toFixed(2)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-5 flex items-center gap-3">
        <Badge variant="outline" className="shrink-0">
          {completedTopics}/{totalTopics}
        </Badge>
        <div className="flex-1 text-sm">
          <span className="text-zinc-700">Konu ilerlemen.</span>{" "}
          <Link href="/ogrenci/konularim" className="text-[#1B6B8A] font-medium hover:underline">
            Konularımı gör →
          </Link>
        </div>
      </div>
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

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-8 text-center text-sm text-zinc-500">
      {text}
    </div>
  )
}
