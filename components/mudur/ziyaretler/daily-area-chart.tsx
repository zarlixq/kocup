"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { EmptyChartCard } from "./empty-state"

type DailyRow = { day: string; label: string; views: number; uniques: number }

export function DailyAreaChart({ data, days }: { data: DailyRow[]; days: number }) {
  const empty = data.length === 0 || data.every((d) => d.views === 0 && d.uniques === 0)

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-6">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h2 className="text-base sm:text-lg font-bold text-zinc-900">Günlük Ziyaret Trendi</h2>
      </div>
      <p className="text-xs text-zinc-500 mb-4">Son {days} gün</p>

      {empty ? (
        <EmptyChartCard label="Bu dönemde henüz ziyaret kaydedilmedi" />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="ziyaretler-g-views" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1B6B8A" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#1B6B8A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ziyaretler-g-uniques" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F97316" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#F97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#a1a1aa"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={20}
              />
              <YAxis
                stroke="#a1a1aa"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={32}
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
                    name === "views" ? "Ziyaret" : "Tekil",
                  ]
                }}
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke="#1B6B8A"
                strokeWidth={2}
                fill="url(#ziyaretler-g-views)"
              />
              <Area
                type="monotone"
                dataKey="uniques"
                stroke="#F97316"
                strokeWidth={2}
                fill="url(#ziyaretler-g-uniques)"
              />
            </AreaChart>
          </ResponsiveContainer>

          <div className="mt-3 flex items-center gap-4 text-xs text-zinc-600">
            <div className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-sm bg-[#1B6B8A]"
                aria-hidden="true"
              />
              Ziyaret
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#F97316]" aria-hidden="true" />
              Tekil ziyaretçi
            </div>
          </div>
        </>
      )}
    </div>
  )
}
