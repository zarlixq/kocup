"use client"

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

type Datum = { subject: string; score: number }

export function SubjectRadarChart({
  data,
  title = "Ders Bazlı Başarı",
  emptyText = "Henüz veri yok — soru çözmeye başla 📚",
  height = 280,
}: {
  data: Datum[]
  title?: string
  emptyText?: string
  height?: number
}) {
  if (data.length === 0 || data.every((d) => d.score === 0)) {
    return <EmptyChart title={title} text={emptyText} height={height} />
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-zinc-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid stroke="#e4e4e7" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 10, fill: "#52525b" }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "#a1a1aa" }}
          />
          <Radar
            name="Başarı %"
            dataKey="score"
            stroke="#1B6B8A"
            fill="#1B6B8A"
            fillOpacity={0.35}
          />
          <Tooltip
            formatter={(value) => [`%${Number(value).toFixed(1)}`, "Başarı"]}
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

function EmptyChart({
  title,
  text,
  height,
}: {
  title: string
  text: string
  height: number
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-zinc-900 mb-4">{title}</h3>
      <div
        className="flex items-center justify-center text-sm text-zinc-500"
        style={{ height }}
      >
        {text}
      </div>
    </div>
  )
}
