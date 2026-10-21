"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export function WeekdayChart({ data }: { data: { name: string; full: string; questions: number; success: number | null }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#52525b" }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#52525b" }} />
        <Tooltip
          cursor={{ fill: "#f4f4f5" }}
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
          labelFormatter={(_l, p) => (p?.[0]?.payload as { full?: string } | undefined)?.full ?? ""}
          formatter={(v, _n, item) => {
            const s = (item.payload as { success: number | null }).success
            return [`${Number(v).toLocaleString("tr-TR")} soru${s !== null ? ` · başarı %${s}` : ""}`, "Toplam"]
          }}
        />
        <Bar dataKey="questions" fill="#1B6B8A" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
