import Link from "next/link"
import { notFound } from "next/navigation"
import {
  Phone,
  School as SchoolIcon,
  User2,
  Mail,
  Target,
  Hash,
  CheckCircle2,
  Percent,
  BookOpen,
  FileText,
  TrendingUp,
  UserCog,
  Eye,
} from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { SubjectRadarChart } from "@/components/charts/subject-radar-chart"
import { ExamTrendChart } from "@/components/charts/exam-trend-chart"
import { SubjectComparisonBar } from "@/components/charts/subject-comparison-bar"
import { WeeklyQuestionsChart } from "@/components/ogrenci/weekly-questions-chart"
import { UpcomingAppointmentCard } from "@/components/randevu/upcoming-appointment-card"
import {
  buildSubjectRadarData,
  buildSubjectComparisonData,
  buildExamTrendData,
} from "@/lib/charts/builders"

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default async function MudurStudentOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const now = new Date()
  const fourteenAgo = new Date(now)
  fourteenAgo.setDate(now.getDate() - 13)
  const fromIso = isoDate(fourteenAgo)
  const nowIso = now.toISOString()

  const [
    { data: student },
    { data: profile },
    { data: allSessions },
    { data: sessions14 },
    { data: topics },
    { count: examCount },
    { data: lastExam },
    { data: upcomingAppt },
    radarData,
    examTrendData,
    comparisonData,
  ] = await Promise.all([
    supabase.from("students").select("*").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("full_name, email, phone").eq("id", id).maybeSingle(),
    supabase.from("study_sessions").select("total_questions, correct").eq("student_id", id),
    supabase
      .from("study_sessions")
      .select("date, total_questions, correct, wrong")
      .eq("student_id", id)
      .gte("date", fromIso),
    supabase.from("student_topics").select("status").eq("student_id", id),
    supabase
      .from("exams")
      .select("*", { count: "exact", head: true })
      .eq("student_id", id),
    supabase
      .from("exams")
      .select("id, name, date, exam_results(net)")
      .eq("student_id", id)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("appointments")
      .select("id, title, type, start_time, end_time, meeting_link, coach_id")
      .eq("student_id", id)
      .eq("status", "planlandi")
      .gte("start_time", nowIso)
      .order("start_time", { ascending: true })
      .limit(1)
      .maybeSingle(),
    buildSubjectRadarData(supabase, id),
    buildExamTrendData(supabase, id),
    buildSubjectComparisonData(supabase, id),
  ])

  if (!student || !profile) notFound()

  // Atanmış koç bilgisi
  const coachId = student.coach_id ?? upcomingAppt?.coach_id ?? null
  const { data: coach } = coachId
    ? await supabase.from("profiles").select("id, full_name").eq("id", coachId).maybeSingle()
    : { data: null }

  // İstatistikler
  const totalQuestions = (allSessions ?? []).reduce((s, r) => s + (r.total_questions ?? 0), 0)
  const totalCorrect = (allSessions ?? []).reduce((s, r) => s + (r.correct ?? 0), 0)
  const successRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 1000) / 10 : 0
  const completedTopics = (topics ?? []).filter((t) => t.status === "tamam").length
  const totalTopics = (topics ?? []).length

  const lastExamNet = lastExam
    ? (lastExam.exam_results ?? []).reduce((s, r) => s + Number(r.net ?? 0), 0)
    : 0

  // 14 günlük chart datası
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
      {/* Readonly banner */}
      <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 text-sm">
        <Eye className="h-4 w-4 text-blue-700 shrink-0" />
        <div className="text-blue-900">
          <span className="font-medium">Sadece görüntüleme.</span>{" "}
          Düzenleme için koçun panelini kullanın.
        </div>
      </div>

      {/* Öğrenci bilgileri + atanan koç */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
        <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={profile.email} />
        <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefon" value={profile.phone} />
        <InfoRow icon={<SchoolIcon className="h-4 w-4" />} label="Okul" value={student.school} />
        <InfoRow icon={<User2 className="h-4 w-4" />} label="Sınıf" value={student.grade ? `${student.grade}. Sınıf` : null} />
        <InfoRow icon={<User2 className="h-4 w-4" />} label="Veli" value={student.parent_name} />
        <InfoRow icon={<Phone className="h-4 w-4" />} label="Veli Telefonu" value={student.parent_phone} />
        <div className="md:col-span-3 pt-3 border-t border-zinc-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500 shrink-0">
            <UserCog className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-zinc-500">Atanmış Koç</div>
            {coach ? (
              <Link
                href={`/mudur/koclar/${coach.id}`}
                className="text-sm font-medium text-[#1B6B8A] hover:underline"
              >
                {coach.full_name}
              </Link>
            ) : (
              <div className="text-sm text-zinc-400">Atanmamış</div>
            )}
          </div>
        </div>
        {(student.target_university || student.target_department || student.target_ranking) && (
          <div className="md:col-span-3 pt-3 border-t border-zinc-100">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-2">
              <Target className="h-4 w-4" /> Hedef
            </div>
            <div className="text-sm text-zinc-700 space-x-3">
              {student.target_university && <span>{student.target_university}</span>}
              {student.target_department && <span className="text-zinc-500">/ {student.target_department}</span>}
              {student.target_ranking && (
                <span className="text-zinc-500">/ Sıralama: {student.target_ranking.toLocaleString("tr-TR")}</span>
              )}
            </div>
          </div>
        )}
        {student.notes && (
          <div className="md:col-span-3 pt-3 border-t border-zinc-100">
            <div className="text-xs text-zinc-500 mb-1">Notlar</div>
            <div className="text-sm text-zinc-700 whitespace-pre-line">{student.notes}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
          <Stat icon={<Hash className="h-4 w-4" />} label="Toplam Soru" value={totalQuestions.toLocaleString("tr-TR")} tone="blue" />
          <Stat icon={<CheckCircle2 className="h-4 w-4" />} label="Toplam Doğru" value={totalCorrect.toLocaleString("tr-TR")} tone="green" />
          <Stat icon={<Percent className="h-4 w-4" />} label="Başarı Oranı" value={`%${successRate.toFixed(1)}`} tone="purple" />
          <Stat icon={<BookOpen className="h-4 w-4" />} label="Konu" value={`${completedTopics}/${totalTopics}`} tone="cyan" />
          <Stat icon={<FileText className="h-4 w-4" />} label="Toplam Deneme" value={String(examCount ?? 0)} tone="orange" />
          <Stat
            icon={<TrendingUp className="h-4 w-4" />}
            label="Son Deneme Net"
            value={lastExam ? lastExamNet.toFixed(2) : "—"}
            tone="rose"
          />
        </div>
        <UpcomingAppointmentCard
          appointment={
            upcomingAppt
              ? {
                  id: upcomingAppt.id,
                  title: upcomingAppt.title,
                  type: upcomingAppt.type,
                  start_time: upcomingAppt.start_time,
                  end_time: upcomingAppt.end_time,
                  meeting_link: upcomingAppt.meeting_link,
                  otherPersonName: coach?.full_name ?? null,
                }
              : null
          }
          href="/mudur/randevular"
          emptyText="Yaklaşan randevu yok"
          emptyHref="/mudur/randevular"
        />
      </div>

      <WeeklyQuestionsChart data={chartData} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SubjectRadarChart data={radarData} />
        <ExamTrendChart data={examTrendData} />
      </div>

      <SubjectComparisonBar data={comparisonData} />
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
        <div className="text-sm font-medium text-zinc-900 truncate">{value || "-"}</div>
      </div>
    </div>
  )
}

const TONES: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700",
  green: "bg-green-50 text-green-700",
  purple: "bg-purple-50 text-purple-700",
  cyan: "bg-cyan-50 text-cyan-700",
  orange: "bg-orange-50 text-[#F97316]",
  rose: "bg-rose-50 text-rose-700",
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: keyof typeof TONES
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all motion-reduce:transition-none motion-reduce:transform-none">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-zinc-500">{label}</div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${TONES[tone]}`}>{icon}</div>
      </div>
      <div className="text-xl font-bold text-zinc-900 tabular-nums">{value}</div>
    </div>
  )
}
