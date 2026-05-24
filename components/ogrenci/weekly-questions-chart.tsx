"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type Datum = { day: string; total: number; correct: number; wrong: number }

export function WeeklyQuestionsChart({ data }: { data: Datum[] }) {
  if (data.length === 0 || data.every((d) => d.total === 0)) {
    return (
      <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center text-sm text-zinc-500">
        Son 14 günde soru çözüm kaydın yok.
      </div>
    )
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-zinc-900 mb-4">Son 14 Gün — Günlük Soru</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value, name) => [
              value,
              name === "correct" ? "Doğru" : name === "wrong" ? "Yanlış" : "Toplam",
            ]}
          />
          <Bar dataKey="correct" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
          <Bar dataKey="wrong" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
