"use client"

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

type Datum = { name: string; value: number; color: string }

export function ApplicationStatusDonut({
  data,
  title = "Bu Ay Başvuru Durumu",
  emptyText = "Bu ay henüz başvuru yok",
  height = 240,
}: {
  data: Datum[]
  title?: string
  emptyText?: string
  height?: number
}) {
  const total = data.reduce((s, d) => s + d.value, 0)

  if (total === 0) {
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
        <PieChart>
          <Pie
            data={data}
            innerRadius={50}
            outerRadius={85}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
            formatter={(value, name) => {
              const num = typeof value === "number" ? value : Number(value)
              return [`${num} (${((num / total) * 100).toFixed(0)}%)`, name]
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
