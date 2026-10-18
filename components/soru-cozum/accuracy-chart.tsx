"use client"

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { AccuracyRow } from "@/lib/soru-cozum/summary"

// Tek seri (doğruluk %) → tek turuncu ton, legend yok; değer bar ucunda nötr mürekkeple.
const BAR = "#EA580C"
const MAX_ROWS = 10

type TooltipPayload = { payload?: AccuracyRow }

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  const row = active ? payload?.[0]?.payload : undefined
  if (!row) return null
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-md">
      <div className="font-semibold text-zinc-900">{row.name}</div>
      <div className="mt-0.5 text-zinc-600 tabular-nums">
        %{row.accuracy} doğruluk · {row.correct}/{row.total.toLocaleString("tr-TR")} soru
      </div>
    </div>
  )
}

export function AccuracyChart({ rows }: { rows: AccuracyRow[] }) {
  const data = rows.slice(0, MAX_ROWS)
  const height = Math.max(120, data.length * 36 + 24)

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }} barCategoryGap={10}>
          <CartesianGrid horizontal={false} stroke="#f4f4f5" />
          <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `%${v}`} />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fontSize: 12, fill: "#3f3f46" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "#fff7ed" }} />
          <Bar dataKey="accuracy" fill={BAR} radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}>
            <LabelList
              dataKey="accuracy"
              position="right"
              formatter={(v) => `%${v}`}
              style={{ fontSize: 11, fill: "#52525b", fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {rows.length > MAX_ROWS && (
        <p className="mt-1 text-[11px] text-zinc-400">En çok soru çözülen {MAX_ROWS} kalem gösteriliyor.</p>
      )}
    </div>
  )
}
