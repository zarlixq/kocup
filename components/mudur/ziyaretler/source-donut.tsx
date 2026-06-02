"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { EmptyChartCard } from "./empty-state"

const COLORS: Record<string, string> = {
  Direkt: "#1B6B8A",
  Organik: "#F97316",
  Sosyal: "#8B5CF6",
  Diğer: "#94a3b8",
}

type SourceRow = { source: string; sessions: number }

export function SourceDonut({ data }: { data: SourceRow[] }) {
  const total = data.reduce((s, d) => s + d.sessions, 0)

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-bold text-zinc-900 mb-1">Trafik Kaynağı</h2>
      <p className="text-xs text-zinc-500 mb-4">Oturumun ilk ziyaretindeki referrer</p>

      {total === 0 ? (
        <EmptyChartCard label="Bu dönemde oturum yok" />
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-5">
          <div className="w-full sm:w-auto" style={{ width: "100%", maxWidth: 200 }}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="sessions"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                  strokeWidth={0}
                  isAnimationActive={false}
                >
                  {data.map((d) => (
                    <Cell key={d.source} fill={COLORS[d.source] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e4e4e7",
                    borderRadius: 12,
                    fontSize: 12,
                    padding: "8px 10px",
                  }}
                  formatter={(v) => {
                    const n = typeof v === "number" ? v : Number(v)
                    return [`${n.toLocaleString("tr-TR")} oturum`, ""]
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="flex-1 space-y-1.5 text-sm w-full">
            {data.map((d) => {
              const pct = total > 0 ? Math.round((d.sessions / total) * 100) : 0
              return (
                <li key={d.source} className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: COLORS[d.source] ?? "#94a3b8" }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 truncate text-zinc-700">{d.source}</span>
                  <span className="text-zinc-500 tabular-nums text-xs">
                    {d.sessions.toLocaleString("tr-TR")} · {pct}%
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
