"use client"

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export type WeeklyMetricsDatum = {
  label: string
  total: number
  successRate: number
  durationMin: number
}

/** İlk veri girilen haftadan önceki boş haftaları kırpar (sonraki boş haftalar 0 kalır). */
export function cropLeadingEmptyWeeks<T extends WeeklyMetricsDatum>(data: T[]): T[] {
  const first = data.findIndex((d) => d.total > 0 || d.durationMin > 0)
  return first === -1 ? [] : data.slice(first)
}

const AXIS = { fontSize: 11, fill: "#52525b" }

// Soru, süre ve başarı farklı ölçekte: tek eksende karışmasın diye üç küçük
// grafik, aynı hafta ekseniyle.
export function WeeklyMetricsChart({
  data,
  title = "Haftalık Trend — Soru / Süre / Başarı",
  emptyText = "Henüz veri yok 📊",
  height = 180,
}: {
  data: WeeklyMetricsDatum[]
  title?: string
  emptyText?: string
  height?: number
}) {
  const rows = cropLeadingEmptyWeeks(data)
  const hasDuration = rows.some((d) => d.durationMin > 0)
  if (rows.length === 0) {
    return (
      <div className="bg-white border border-zinc-200 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-zinc-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center text-sm text-zinc-500" style={{ height }}>
          {emptyText}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-zinc-900 mb-4">{title}</h3>
      <div className={`grid grid-cols-1 gap-5 ${hasDuration ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
        <MiniChart label="Çözülen soru" height={height}>
          <BarChart data={rows} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
            <XAxis dataKey="label" tick={AXIS} />
            <YAxis allowDecimals={false} tick={AXIS} />
            <Tooltip
              cursor={{ fill: "#f4f4f5" }}
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
              formatter={(v) => [Number(v).toLocaleString("tr-TR"), "Soru"]}
              labelFormatter={(l) => `${l} haftası`}
            />
            <Bar dataKey="total" fill="#1B6B8A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </MiniChart>
        {hasDuration && (
          <MiniChart label="Çalışma süresi (dk)" height={height}>
            <BarChart data={rows} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
              <XAxis dataKey="label" tick={AXIS} />
              <YAxis allowDecimals={false} tick={AXIS} />
              <Tooltip
                cursor={{ fill: "#f4f4f5" }}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`${Number(v).toLocaleString("tr-TR")} dk`, "Süre"]}
                labelFormatter={(l) => `${l} haftası`}
              />
              <Bar dataKey="durationMin" fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </MiniChart>
        )}
        <MiniChart label="Başarı %" height={height}>
          <LineChart data={rows.map((d) => ({ ...d, rate: d.total > 0 ? d.successRate : null }))} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
            <XAxis dataKey="label" tick={AXIS} />
            <YAxis domain={[0, 100]} tick={AXIS} tickFormatter={(v) => `%${v}`} />
            <Tooltip
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
              formatter={(v) => [v === null ? "—" : `%${Number(v).toFixed(1)}`, "Başarı"]}
              labelFormatter={(l) => `${l} haftası`}
            />
            <Line type="monotone" dataKey="rate" stroke="#F97316" strokeWidth={2} dot={{ r: 4 }} connectNulls />
          </LineChart>
        </MiniChart>
      </div>
    </div>
  )
}

function MiniChart({ label, height, children }: { label: string; height: number; children: React.ReactElement }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-zinc-500">{label}</div>
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  )
}
