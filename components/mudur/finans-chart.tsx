"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type Datum = { coach: string; amount: number }

export function CoachRevenueChart({ data }: { data: Datum[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center text-sm text-zinc-500">
        Tahsilat verisi yok.
      </div>
    )
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-zinc-900 mb-4">Koç Bazlı Tahsilat</h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis dataKey="coach" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₺${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            formatter={(value) =>
              new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(Number(value))
            }
          />
          <Bar dataKey="amount" fill="#1B6B8A" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
