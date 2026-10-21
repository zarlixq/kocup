"use client"

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

/** Haftalık program: planlanan vs yapılan kalem (aynı birim → tek eksen). */
export function ComplianceChart({ data }: { data: { label: string; planned: number; done: number; percent: number | null }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#52525b" }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#52525b" }} />
        <Tooltip
          cursor={{ fill: "#f4f4f5" }}
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
          labelFormatter={(l, p) => {
            const row = p?.[0]?.payload as { percent: number | null } | undefined
            return `${l} haftası${row?.percent != null ? ` · uyum %${row.percent}` : " · program yok"}`
          }}
          formatter={(v, n) => [`${v} kalem`, n === "planned" ? "Planlanan" : "Yapılan"]}
        />
        <Legend formatter={(v) => (v === "planned" ? "Planlanan" : "Yapılan")} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="planned" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
        <Bar dataKey="done" fill="#F97316" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
