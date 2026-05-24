"use client"

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export type ExamTrendDatum = {
  date: string
  name: string
  tytNet: number | null
  aytNet: number | null
}

export function ExamTrendChart({
  data,
  title = "Deneme Net Seyri",
  emptyText = "Henüz deneme kaydı yok — ilk denemeni gir 📝",
  height = 280,
}: {
  data: ExamTrendDatum[]
  title?: string
  emptyText?: string
  height?: number
}) {
  if (data.length === 0) {
    return (
      <div className="bg-white border border-zinc-200 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-zinc-900 mb-4">{title}</h3>
        <div
          className="flex items-center justify-center text-sm text-zinc-500"
          style={{ height }}
        >
          {emptyText}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-zinc-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#52525b" }}
            tickFormatter={(v: string) => v.slice(5).replace("-", "/")}
          />
          <YAxis tick={{ fontSize: 11, fill: "#52525b" }} />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
            labelFormatter={(label, payload) => {
              const p = payload?.[0]?.payload as ExamTrendDatum | undefined
              return p ? `${p.name} — ${p.date}` : label
            }}
            formatter={(value, name) => {
              if (value === null || value === undefined) return ["—", name]
              const num = typeof value === "number" ? value : Number(value)
              const label = name === "tytNet" ? "TYT Net" : "AYT Net"
              return [num.toFixed(2), label]
            }}
          />
          <Legend
            formatter={(value) => (value === "tytNet" ? "TYT Net" : "AYT Net")}
            wrapperStyle={{ fontSize: 12 }}
          />
          <Line
            type="monotone"
            dataKey="tytNet"
            stroke="#1B6B8A"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="aytNet"
            stroke="#F97316"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
