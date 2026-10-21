"use client"

import { useMemo, useState } from "react"
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { cn } from "@/lib/utils"

export type ExamChartType = {
  type: string
  label: string
  rows: ({ date: string; name: string; net: number } & Record<string, number | string>)[]
  series: { key: string; name: string; color: string }[]
}

const FALLBACK = ["#1B6B8A", "#F97316", "#10b981", "#a855f7", "#eab308", "#ef4444", "#0ea5e9", "#64748b"]

function trDate(iso: string, year = false) {
  return year ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : `${iso.slice(8, 10)}.${iso.slice(5, 7)}`
}

// Sınav türü sekmesi + ders toggle'ı: toplam net her zaman, seçili derslerin netleri ayrı çizgi.
export function ExamsChart({ types }: { types: ExamChartType[] }) {
  const [type, setType] = useState(types[0]?.type ?? "")
  const current = types.find((t) => t.type === type) ?? types[0]
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const series = useMemo(
    () => (current?.series ?? []).map((s, i) => ({ ...s, color: s.color || FALLBACK[i % FALLBACK.length] })),
    [current],
  )
  if (!current) return null
  const visible = series.filter((s) => !hidden.has(s.key))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {types.length > 1 && (
          <div className="inline-flex rounded-lg border border-zinc-200 p-0.5 text-xs" role="tablist" aria-label="Sınav türü">
            {types.map((t) => (
              <button
                key={t.type}
                role="tab"
                aria-selected={t.type === current.type}
                onClick={() => {
                  setType(t.type)
                  setHidden(new Set())
                }}
                className={cn("rounded-md px-3 py-1.5 font-medium", t.type === current.type ? "bg-[#1B6B8A] text-white" : "text-zinc-600 hover:bg-zinc-50")}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5" aria-label="Ders netleri">
          {series.map((s) => {
            const on = !hidden.has(s.key)
            return (
              <button
                key={s.key}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setHidden((h) => {
                    const n = new Set(h)
                    if (n.has(s.key)) n.delete(s.key)
                    else n.add(s.key)
                    return n
                  })
                }
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs",
                  on ? "border-zinc-300 bg-white text-zinc-800" : "border-zinc-200 bg-zinc-50 text-zinc-400",
                )}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: on ? s.color : "#d4d4d8" }} />
                {s.name}
              </button>
            )
          })}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={current.rows} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#52525b" }} tickFormatter={(v: string) => trDate(v)} />
          <YAxis tick={{ fontSize: 11, fill: "#52525b" }} />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
            labelFormatter={(l, p) => {
              const row = p?.[0]?.payload as { name?: string } | undefined
              return `${row?.name ?? ""} — ${trDate(String(l), true)}`
            }}
            formatter={(v, n) => [Number(v).toLocaleString("tr-TR", { maximumFractionDigits: 2 }), n === "net" ? "Toplam net" : (series.find((s) => s.key === n)?.name ?? n)]}
          />
          <Legend
            formatter={(v) => (v === "net" ? `${current.label} toplam net` : (series.find((s) => s.key === v)?.name ?? v))}
            wrapperStyle={{ fontSize: 12 }}
          />
          <Line type="monotone" dataKey="net" stroke="#18181b" strokeWidth={2.5} dot={{ r: 4 }} />
          {visible.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} dot={{ r: 3 }} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
