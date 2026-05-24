"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type Datum = { date: string; total: number }

export function SystemQuestionsTrend({
  data,
  title = "Sistem Geneli Soru Çözüm Trendi — Son 30 Gün",
  emptyText = "Henüz veri yok",
  height = 240,
}: {
  data: Datum[]
  title?: string
  emptyText?: string
  height?: number
}) {
  if (data.length === 0 || data.every((d) => d.total === 0)) {
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
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="navyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1B6B8A" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#1B6B8A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#52525b" }}
            tickFormatter={(v: string) => v.slice(5).replace("-", "/")}
            minTickGap={20}
          />
          <YAxis tick={{ fontSize: 11, fill: "#52525b" }} />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
            formatter={(value) => [
              Number(value).toLocaleString("tr-TR"),
              "Toplam Soru",
            ]}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#1B6B8A"
            strokeWidth={2}
            fill="url(#navyGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
