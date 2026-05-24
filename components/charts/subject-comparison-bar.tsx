"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export type SubjectComparisonDatum = {
  subject: string
  total: number
  correct: number
}

export function SubjectComparisonBar({
  data,
  title = "Ders Bazlı Soru / Doğru",
  emptyText = "Henüz soru çözüm kaydın yok 📊",
  height = 320,
}: {
  data: SubjectComparisonDatum[]
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
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#52525b" }} />
          <YAxis
            type="category"
            dataKey="subject"
            tick={{ fontSize: 11, fill: "#52525b" }}
            width={110}
          />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
            formatter={(value, name) => [
              Number(value).toLocaleString("tr-TR"),
              name === "total" ? "Toplam Soru" : "Doğru",
            ]}
          />
          <Legend
            formatter={(value) => (value === "total" ? "Toplam Soru" : "Doğru")}
            wrapperStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="total" fill="#1B6B8A" radius={[0, 4, 4, 0]} />
          <Bar dataKey="correct" fill="#10b981" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
