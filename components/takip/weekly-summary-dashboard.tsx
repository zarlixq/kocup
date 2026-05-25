"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Hash, CheckCircle2, Percent, Clock, AlertTriangle, BookOpenCheck } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  WeeklyMetricsChart,
  type WeeklyMetricsDatum,
} from "@/components/charts/weekly-metrics-chart"

export type TakipSession = {
  student_id: string
  date: string
  total_questions: number
  correct: number
  duration_minutes: number | null
}

export type TakipAssignment = {
  id: string
  student_id: string
  topic_name: string
  subject_name: string
  hedef_soru: number
  son_tarih: string
  cozulen_soru: number
  status: "aktif" | "tamamlandi" | "iptal"
}

type Student = { id: string; full_name: string }
type Range = "week" | "month" | "4weeks"

const TONES: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700",
  green: "bg-green-50 text-green-700",
  purple: "bg-purple-50 text-purple-700",
  orange: "bg-orange-50 text-[#F97316]",
  cyan: "bg-cyan-50 text-cyan-700",
}

function StatTile({
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
        <span className="text-xs text-zinc-500">{label}</span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${TONES[tone]}`}>
          {icon}
        </span>
      </div>
      <div className="text-2xl font-bold text-zinc-900 tabular-nums">{value}</div>
    </div>
  )
}

function startOfWeek(d: Date) {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = r.getDay()
  const diff = day === 0 ? -6 : 1 - day
  r.setDate(r.getDate() + diff)
  return r
}

function rangeStart(range: Range, today: Date) {
  if (range === "week") return startOfWeek(today)
  if (range === "month") return new Date(today.getFullYear(), today.getMonth(), 1)
  // 4 weeks back from current week start
  const w = startOfWeek(today)
  w.setDate(w.getDate() - 21)
  return w
}

export function WeeklySummaryDashboard({
  students,
  sessions,
  assignments,
}: {
  students: Student[]
  sessions: TakipSession[]
  assignments: TakipAssignment[]
}) {
  const [studentId, setStudentId] = useState<string>(students[0]?.id ?? "")
  const [range, setRange] = useState<Range>("week")
  const today = useMemo(() => new Date(), [])
  const start = useMemo(() => rangeStart(range, today), [range, today])

  // Seçili öğrenci için dönem içi sessions
  const periodSessions = useMemo(
    () =>
      sessions.filter(
        (s) => s.student_id === studentId && new Date(s.date) >= start,
      ),
    [sessions, studentId, start],
  )

  const stats = useMemo(() => {
    let total = 0
    let correct = 0
    let duration = 0
    for (const s of periodSessions) {
      total += s.total_questions ?? 0
      correct += s.correct ?? 0
      duration += s.duration_minutes ?? 0
    }
    return {
      total,
      correct,
      successRate: total > 0 ? Math.round((correct / total) * 1000) / 10 : 0,
      hours: Math.round((duration / 60) * 10) / 10,
    }
  }, [periodSessions])

  // 8 hafta grafik datası (range'den bağımsız, geniş trend)
  const weeklyData = useMemo<WeeklyMetricsDatum[]>(() => {
    const weeks = 8
    const currentMon = startOfWeek(today)
    const result: WeeklyMetricsDatum[] = []
    for (let i = weeks - 1; i >= 0; i--) {
      const wkStart = new Date(currentMon)
      wkStart.setDate(currentMon.getDate() - i * 7)
      const wkEnd = new Date(wkStart)
      wkEnd.setDate(wkStart.getDate() + 7)
      let total = 0
      let correct = 0
      let dur = 0
      for (const s of sessions) {
        if (s.student_id !== studentId) continue
        const sd = new Date(s.date)
        if (sd >= wkStart && sd < wkEnd) {
          total += s.total_questions ?? 0
          correct += s.correct ?? 0
          dur += s.duration_minutes ?? 0
        }
      }
      result.push({
        label: `${String(wkStart.getDate()).padStart(2, "0")}/${String(wkStart.getMonth() + 1).padStart(2, "0")}`,
        total,
        successRate: total > 0 ? Math.round((correct / total) * 1000) / 10 : 0,
        durationMin: dur,
      })
    }
    return result
  }, [sessions, studentId, today])

  // Bu öğrenci için gecikmiş atamalar (read-time hesap)
  const overdue = useMemo(() => {
    return assignments.filter((a) => {
      if (a.student_id !== studentId) return false
      if (a.status !== "aktif") return false
      const son = new Date(a.son_tarih)
      son.setHours(23, 59, 59, 999)
      return son < today && a.cozulen_soru < a.hedef_soru
    })
  }, [assignments, studentId, today])

  const activeOpen = useMemo(
    () =>
      assignments.filter(
        (a) => a.student_id === studentId && a.status === "aktif" && a.cozulen_soru < a.hedef_soru,
      ).length,
    [assignments, studentId],
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">Öğrenci</label>
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger>
              <SelectValue placeholder="Seç" />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">Dönem</label>
          <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5">
            {(["week", "month", "4weeks"] as Range[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  range === r
                    ? "bg-[#1B6B8A] text-white"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {r === "week" ? "Bu Hafta" : r === "month" ? "Bu Ay" : "Son 4 Hafta"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {studentId ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatTile icon={<Hash className="h-4 w-4" />} label="Toplam Soru" value={stats.total.toLocaleString("tr-TR")} tone="blue" />
            <StatTile icon={<CheckCircle2 className="h-4 w-4" />} label="Doğru" value={stats.correct.toLocaleString("tr-TR")} tone="green" />
            <StatTile icon={<Percent className="h-4 w-4" />} label="Başarı" value={`%${stats.successRate.toFixed(1)}`} tone="purple" />
            <StatTile icon={<Clock className="h-4 w-4" />} label="Süre" value={`${stats.hours} sa`} tone="orange" />
            <StatTile icon={<BookOpenCheck className="h-4 w-4" />} label="Aktif Atama" value={String(activeOpen)} tone="cyan" />
          </div>

          {overdue.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold text-red-900">
                  Gecikmiş Atamalar ({overdue.length})
                </h3>
              </div>
              <div className="space-y-2">
                {overdue.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between bg-white border border-red-100 rounded-lg px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-zinc-900 truncate">
                        {a.subject_name} — {a.topic_name}
                      </div>
                      <div className="text-xs text-zinc-500">
                        Hedef: {a.hedef_soru} · İlerleme: {a.cozulen_soru} ·{" "}
                        {new Date(a.son_tarih).toLocaleDateString("tr-TR")}
                      </div>
                    </div>
                    <Link
                      href={`/koc/ogrenciler/${a.student_id}/konu-analizi`}
                      className="text-xs text-[#1B6B8A] hover:underline shrink-0 ml-3"
                    >
                      Detay →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          <WeeklyMetricsChart data={weeklyData} title="Son 8 Hafta Trend" />
        </>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center text-sm text-zinc-500">
          Aktif öğrencin yok.
        </div>
      )}
    </div>
  )
}
