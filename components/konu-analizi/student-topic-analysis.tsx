"use client"

import { useMemo } from "react"
import { Hash, CheckCircle2, Percent, Clock } from "lucide-react"
import { SubjectRadarChart } from "@/components/charts/subject-radar-chart"
import { SubjectComparisonBar } from "@/components/charts/subject-comparison-bar"
import {
  WeeklyMetricsChart,
  type WeeklyMetricsDatum,
} from "@/components/charts/weekly-metrics-chart"

type Session = {
  id: string
  date: string
  total_questions: number
  correct: number
  wrong: number
  duration_minutes: number | null
  subject_id: string
  subjects: { name: string; order: number } | null
}

const TONES: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700",
  green: "bg-green-50 text-green-700",
  purple: "bg-purple-50 text-purple-700",
  orange: "bg-orange-50 text-[#F97316]",
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

export function StudentTopicAnalysis({ sessions }: { sessions: Session[] }) {
  const stats = useMemo(() => {
    let total = 0
    let correct = 0
    let duration = 0
    for (const s of sessions) {
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
  }, [sessions])

  const radarData = useMemo(() => {
    const agg = new Map<string, { name: string; order: number; total: number; correct: number }>()
    for (const s of sessions) {
      const subj = s.subjects
      if (!subj) continue
      const cur = agg.get(s.subject_id) ?? { name: subj.name, order: subj.order, total: 0, correct: 0 }
      cur.total += s.total_questions ?? 0
      cur.correct += s.correct ?? 0
      agg.set(s.subject_id, cur)
    }
    return Array.from(agg.values())
      .sort((a, b) => a.order - b.order)
      .map((v) => ({
        subject: v.name,
        score: v.total > 0 ? Math.round((v.correct / v.total) * 1000) / 10 : 0,
      }))
  }, [sessions])

  const comparisonData = useMemo(() => {
    const agg = new Map<string, { name: string; total: number; correct: number }>()
    for (const s of sessions) {
      const subj = s.subjects
      if (!subj) continue
      const cur = agg.get(s.subject_id) ?? { name: subj.name, total: 0, correct: 0 }
      cur.total += s.total_questions ?? 0
      cur.correct += s.correct ?? 0
      agg.set(s.subject_id, cur)
    }
    return Array.from(agg.values())
      .filter((v) => v.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map((v) => ({ subject: v.name, total: v.total, correct: v.correct }))
  }, [sessions])

  const weeklyData = useMemo<WeeklyMetricsDatum[]>(() => {
    const weeks = 8
    const today = new Date()
    const startOfWeek = (d: Date) => {
      const r = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      const day = r.getDay()
      const diff = day === 0 ? -6 : 1 - day
      r.setDate(r.getDate() + diff)
      return r
    }
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
  }, [sessions])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile icon={<Hash className="h-4 w-4" />} label="Toplam Soru" value={stats.total.toLocaleString("tr-TR")} tone="blue" />
        <StatTile icon={<CheckCircle2 className="h-4 w-4" />} label="Toplam Doğru" value={stats.correct.toLocaleString("tr-TR")} tone="green" />
        <StatTile icon={<Percent className="h-4 w-4" />} label="Başarı Oranı" value={`%${stats.successRate.toFixed(1)}`} tone="purple" />
        <StatTile icon={<Clock className="h-4 w-4" />} label="Toplam Süre" value={`${stats.hours} sa`} tone="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SubjectRadarChart data={radarData} />
        <SubjectComparisonBar data={comparisonData} />
      </div>

      <WeeklyMetricsChart data={weeklyData} />
    </div>
  )
}
