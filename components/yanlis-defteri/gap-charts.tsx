"use client"

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ERROR_TYPES, ERROR_TYPE_COLOR, ERROR_TYPE_LABEL, type ErrorType } from "@/lib/yanlis-defteri/constants"
import type { TrendWeek } from "@/lib/yanlis-defteri/load"

// İki grafik de aynı 5 renkli kategorik paleti (ERROR_TYPE_COLOR) kullanır;
// renk tipe bağlı, sıra sabit. ≥2 seri → lejant her zaman açık; değerler
// tooltip'te nötr mürekkeple. Segmentler arası 2px yüzey boşluğu (stroke).

type StackRow = { label: string } & Record<ErrorType, number>

function StackTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { dataKey?: string | number; value?: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const rows = payload.filter((p) => (p.value ?? 0) > 0)
  const total = rows.reduce((s, p) => s + (p.value ?? 0), 0)
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-semibold text-zinc-900">
        {label} · {total} yanlış
      </div>
      {rows.map((p) => {
        const t = String(p.dataKey) as ErrorType
        return (
          <div key={t} className="flex items-center gap-2 text-zinc-600">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ERROR_TYPE_COLOR[t] }} />
            <span className="flex-1">{ERROR_TYPE_LABEL[t]}</span>
            <span className="tabular-nums text-zinc-900">{p.value}</span>
          </div>
        )
      })}
    </div>
  )
}

function legendFormatter(value: string) {
  return <span className="text-xs text-zinc-600">{ERROR_TYPE_LABEL[value as ErrorType] ?? value}</span>
}

/** Ders (veya konu) başına hata tipi dağılımı — yatay yığılmış bar. */
export function ErrorDistributionChart({ rows }: { rows: StackRow[] }) {
  const height = Math.max(140, rows.length * 34 + 70)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }} barCategoryGap={8}>
        <CartesianGrid horizontal={false} stroke="#f4f4f5" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={120}
          tick={{ fontSize: 12, fill: "#3f3f46" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)}
        />
        <Tooltip content={<StackTooltip />} cursor={{ fill: "#fafafa" }} />
        <Legend formatter={legendFormatter} iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 8 }} />
        {ERROR_TYPES.map((t) => (
          <Bar key={t} dataKey={t} stackId="e" fill={ERROR_TYPE_COLOR[t]} stroke="#ffffff" strokeWidth={2} maxBarSize={18} isAnimationActive={false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Son 4 hafta, hata tipi başına yanlış sayısı — yığılmış sütun. */
export function GapTrendChart({ weeks }: { weeks: TrendWeek[] }) {
  const data = weeks.map((w, i) => ({
    ...w,
    label: i === weeks.length - 1 ? "Bu hafta" : `${weeks.length - 1 - i} hf önce`,
  }))
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid vertical={false} stroke="#f4f4f5" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
        <Tooltip content={<StackTooltip />} cursor={{ fill: "#fafafa" }} />
        <Legend formatter={legendFormatter} iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 8 }} />
        {ERROR_TYPES.map((t) => (
          <Bar key={t} dataKey={t} stackId="w" fill={ERROR_TYPE_COLOR[t]} stroke="#ffffff" strokeWidth={2} maxBarSize={36} isAnimationActive={false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
