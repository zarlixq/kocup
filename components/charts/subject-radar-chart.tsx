"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type Datum = { subject: string; score: number }

/** Radar en az bu kadar dersle anlamlı; altında yatay bar. */
const RADAR_MIN_SUBJECTS = 3

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
      <ResponsiveContainer width="100%" height={data.length < RADAR_MIN_SUBJECTS ? Math.max(120, data.length * 48 + 30) : height}>
        {data.length < RADAR_MIN_SUBJECTS ? (
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#52525b" }} tickFormatter={(v) => `%${v}`} />
            <YAxis type="category" dataKey="subject" tick={{ fontSize: 11, fill: "#52525b" }} width={110} />
            <Tooltip
              cursor={{ fill: "#f4f4f5" }}
              formatter={(value) => [`%${Number(value).toFixed(1)}`, "Başarı"]}
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="score" fill="#1B6B8A" radius={[0, 4, 4, 0]} barSize={20} />
          </BarChart>
        ) : (
          <RadarChart data={data} outerRadius="75%">
            <PolarGrid stroke="#e4e4e7" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#52525b" }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: "#a1a1aa" }} />
            <Radar name="Başarı %" dataKey="score" stroke="#1B6B8A" fill="#1B6B8A" fillOpacity={0.35} />
            <Tooltip formatter={(value) => [`%${Number(value).toFixed(1)}`, "Başarı"]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
          </RadarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

function EmptyChart({ title, text, height }: { title: string; text: string; height: number }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-zinc-900 mb-4">{title}</h3>
      <div className="flex items-center justify-center text-sm text-zinc-500" style={{ height }}>
        {text}
      </div>
    </div>
  )
}
