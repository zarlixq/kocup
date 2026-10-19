"use client"

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { MasteryTrendPoint } from "@/lib/upplan/load"

function ddmm(iso: string) {
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}`
}

// Genel ustalık ortalaması — 8 haftalık tek seri (başlık seriyi adlandırır, lejant yok).
export function MasteryTrendChart({ data }: { data: MasteryTrendPoint[] }) {
  const points = data.filter((d) => d.overall !== null)
  if (points.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center text-center text-sm text-zinc-500">
        Trend için en az iki haftalık veri gerekiyor.
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#f4f4f5" />
        <XAxis dataKey="week_end" tickFormatter={ddmm} tick={{ fontSize: 11, fill: "#71717a" }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} ticks={[0, 40, 75, 100]} tick={{ fontSize: 11, fill: "#71717a" }} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ stroke: "#a1a1aa", strokeDasharray: "3 3" }}
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
          labelFormatter={(l) => `Hafta sonu ${typeof l === "string" ? `${ddmm(l)}.${l.slice(0, 4)}` : l}`}
          formatter={(v) => [typeof v === "number" ? v.toFixed(1) : "—", "Ortalama ustalık"]}
        />
        <Line
          type="monotone"
          dataKey="overall"
          stroke="#1B6B8A"
          strokeWidth={2}
          dot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
          activeDot={{ r: 5 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
