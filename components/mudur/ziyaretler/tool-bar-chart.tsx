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
import { EmptyChartCard } from "./empty-state"

type ToolRow = { label: string; uses: number; sessions: number }

export function ToolBarChart({ data }: { data: ToolRow[] }) {
  const empty = data.length === 0 || data.every((d) => d.uses === 0)

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-bold text-zinc-900 mb-1">Araç Kullanımı</h2>
      <p className="text-xs text-zinc-500 mb-4">tool_use eventleri ve tekil oturum sayısı</p>

      {empty ? (
        <EmptyChartCard label="Bu dönemde araç kullanımı yok" />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#a1a1aa"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={0}
              />
              <YAxis
                stroke="#a1a1aa"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e4e4e7",
                  borderRadius: 12,
                  fontSize: 12,
                  padding: "8px 10px",
                }}
                labelStyle={{ fontWeight: 600, marginBottom: 4, color: "#18181b" }}
                formatter={(value, name) => {
                  const n = typeof value === "number" ? value : Number(value)
                  return [
                    n.toLocaleString("tr-TR"),
                    name === "uses" ? "Kullanım" : "Oturum",
                  ]
                }}
              />
              <Bar dataKey="uses" name="uses" fill="#F97316" radius={[8, 8, 0, 0]} />
              <Bar dataKey="sessions" name="sessions" fill="#1B6B8A" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-3 flex items-center gap-4 text-xs text-zinc-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#F97316]" aria-hidden="true" />
              Kullanım
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#1B6B8A]" aria-hidden="true" />
              Tekil oturum
            </div>
          </div>
        </>
      )}
    </div>
  )
}
