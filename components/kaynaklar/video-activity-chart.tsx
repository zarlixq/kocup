"use client"

import { useState } from "react"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { cn } from "@/lib/utils"
import type { ActivityDatum, ActivitySeries } from "@/lib/resources/video-summary"

// Günlük izlenen video sayısı / dakikası, ders bazında yığılmış bar.
// Stil "Kaynak Bazlı Çözülen Soru" (SubjectComparisonBar) ile aynı.
export function VideoActivityChart({
  data,
  series,
  title = "Haftalık Video Aktivitesi",
  height = 260,
}: {
  data: ActivityDatum[]
  series: ActivitySeries[]
  title?: string
  height?: number
}) {
  const [metric, setMetric] = useState<"c" | "m">("c")
  const hasMinutes = data.some((d) => series.some((s) => Number(d[`m_${s.key}`] ?? 0) > 0))
  const active = metric === "m" && hasMinutes ? "m" : "c"

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        {series.length > 0 && hasMinutes && (
          <div className="inline-flex rounded-lg border border-zinc-200 p-0.5 text-xs" role="group" aria-label="Ölçü">
            {(
              [
                ["c", "Video"],
                ["m", "Dakika"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setMetric(k)}
                aria-pressed={active === k}
                className={cn("rounded-md px-3 py-1.5", active === k ? "bg-[#1B6B8A] text-white" : "text-zinc-600 hover:bg-zinc-50")}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {series.length === 0 ? (
        <div className="flex items-center justify-center text-center text-sm text-zinc-500" style={{ height }}>
          Son 7 günde izlenen video yok. İzlediğin videoları işaretledikçe burada görünür 🎬
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#52525b" }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#52525b" }} width={40} />
            <Tooltip
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
              formatter={(value, name) => {
                const s = series.find((x) => `${active}_${x.key}` === name)
                return [`${Number(value).toLocaleString("tr-TR")} ${active === "c" ? "video" : "dk"}`, s?.name ?? String(name)]
              }}
            />
            <Legend
              formatter={(value) => series.find((x) => `${active}_${x.key}` === value)?.name ?? value}
              wrapperStyle={{ fontSize: 12 }}
            />
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={`${active}_${s.key}`}
                stackId="v"
                fill={s.color}
                radius={i === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
