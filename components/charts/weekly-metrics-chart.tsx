"use client"

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export type WeeklyMetricsDatum = {
  label: string
  total: number
  successRate: number
  durationMin: number
}

export function WeeklyMetricsChart({
  data,
  title = "Haftalık Trend — Soru / Başarı / Süre",
  emptyText = "Henüz veri yok 📊",
  height = 300,
}: {
  data: WeeklyMetricsDatum[]
  title?: string
  emptyText?: string
  height?: number
}) {
  if (data.length === 0 || data.every((d) => d.total === 0 && d.durationMin === 0)) {
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
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#52525b" }} />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "#52525b" }}
            label={{ value: "Soru / Dk", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "#71717a" } }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#52525b" }}
            label={{ value: "% Başarı", angle: 90, position: "insideRight", style: { fontSize: 10, fill: "#71717a" } }}
          />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
            formatter={(value, name) => {
              const num = Number(value)
              if (name === "successRate") return [`%${num.toFixed(1)}`, "Başarı"]
              if (name === "total") return [num.toLocaleString("tr-TR"), "Soru"]
              if (name === "durationMin") return [`${num} dk`, "Süre"]
              return [String(value), name]
            }}
          />
          <Legend
            formatter={(value) => {
              if (value === "successRate") return "Başarı %"
              if (value === "total") return "Soru"
              if (value === "durationMin") return "Süre (dk)"
              return value
            }}
            wrapperStyle={{ fontSize: 12 }}
          />
          <Bar yAxisId="left" dataKey="total" fill="#1B6B8A" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="left" dataKey="durationMin" fill="#a855f7" radius={[4, 4, 0, 0]} />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="successRate"
            stroke="#F97316"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
