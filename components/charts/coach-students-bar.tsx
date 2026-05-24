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

type Datum = { coach: string; count: number }

export function CoachStudentsBar({
  data,
  title = "Koç Başına Aktif Öğrenci",
  emptyText = "Henüz koç ataması yok",
  height = 240,
}: {
  data: Datum[]
  title?: string
  emptyText?: string
  height?: number
}) {
  if (data.length === 0 || data.every((d) => d.count === 0)) {
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
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#52525b" }} />
          <YAxis
            type="category"
            dataKey="coach"
            tick={{ fontSize: 11, fill: "#52525b" }}
            width={130}
          />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
            formatter={(value) => [String(value), "Öğrenci"]}
          />
          <Bar dataKey="count" fill="#F97316" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
