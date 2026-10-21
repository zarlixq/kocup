"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { cn } from "@/lib/utils"

export type SubjectTableRow = {
  id: string
  name: string
  color: string | null
  questions: number
  correct: number
  wrong: number
  empty: number
  success: number | null
  minutes: number
  perMinute: number | null
  videoWatched: number
  videoTotal: number
  topicPct: number | null
  lastDate: string | null
}

type Key = keyof Pick<
  SubjectTableRow,
  "name" | "questions" | "correct" | "wrong" | "empty" | "success" | "minutes" | "perMinute" | "videoWatched" | "topicPct" | "lastDate"
>

const COLS: { key: Key; label: string; className?: string }[] = [
  { key: "name", label: "Ders" },
  { key: "questions", label: "Soru" },
  { key: "correct", label: "Doğru" },
  { key: "wrong", label: "Yanlış" },
  { key: "empty", label: "Boş" },
  { key: "success", label: "Başarı" },
  { key: "minutes", label: "Süre" },
  { key: "perMinute", label: "Soru/dk" },
  { key: "videoWatched", label: "Video" },
  { key: "topicPct", label: "Konu %" },
  { key: "lastDate", label: "Son çalışma" },
]

function tone(p: number | null): string {
  if (p === null) return "text-zinc-400"
  if (p < 50) return "bg-red-50 text-red-700"
  if (p <= 70) return "bg-amber-50 text-amber-700"
  return "bg-emerald-50 text-emerald-700"
}

function trDate(iso: string | null): string {
  return iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "—"
}

export function SubjectsTable({ rows, detailHref, selectedId }: { rows: SubjectTableRow[]; detailHref: Record<string, string>; selectedId: string | null }) {
  const router = useRouter()
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "questions", dir: -1 })
  const sorted = useMemo(() => {
    const val = (r: SubjectTableRow) => r[sort.key]
    return [...rows].sort((a, b) => {
      const x = val(a)
      const y = val(b)
      if (x === y) return 0
      if (x === null) return 1
      if (y === null) return -1
      return (typeof x === "string" ? x.localeCompare(String(y), "tr") : (x as number) - (y as number)) * sort.dir
    })
  }, [rows, sort])

  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500">
            {COLS.map((c) => (
              <th key={c.key} className="px-3 py-2.5 font-medium" aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:text-zinc-900"
                  onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? (s.dir === 1 ? -1 : 1) : c.key === "name" ? 1 : -1 }))}
                >
                  {c.label}
                  {sort.key === c.key && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                </button>
              </th>
            ))}
            <th className="w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {sorted.map((r) => (
            <tr
              key={r.id}
              onClick={() => router.push(detailHref[r.id], { scroll: false })}
              className={cn("cursor-pointer hover:bg-zinc-50", selectedId === r.id && "bg-orange-50/60")}
            >
              <td className="px-3 py-2.5 font-medium text-zinc-900">
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: r.color ?? "#a1a1aa" }} />
                {r.name}
              </td>
              <td className="px-3 py-2.5 tabular-nums">{r.questions.toLocaleString("tr-TR")}</td>
              <td className="px-3 py-2.5 tabular-nums">{r.correct.toLocaleString("tr-TR")}</td>
              <td className="px-3 py-2.5 tabular-nums">{r.wrong.toLocaleString("tr-TR")}</td>
              <td className="px-3 py-2.5 tabular-nums">{r.empty.toLocaleString("tr-TR")}</td>
              <td className="px-3 py-2.5">
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", tone(r.success))}>
                  {r.success === null ? "—" : `%${r.success.toLocaleString("tr-TR")}`}
                </span>
              </td>
              <td className="px-3 py-2.5 tabular-nums">{r.minutes ? `${r.minutes} dk` : "—"}</td>
              <td className="px-3 py-2.5 tabular-nums">{r.perMinute === null ? "—" : r.perMinute.toLocaleString("tr-TR")}</td>
              <td className="px-3 py-2.5 tabular-nums">{r.videoTotal ? `${r.videoWatched}/${r.videoTotal}` : "—"}</td>
              <td className="px-3 py-2.5 tabular-nums">{r.topicPct === null ? "—" : `%${r.topicPct}`}</td>
              <td className="px-3 py-2.5 tabular-nums text-zinc-600">{trDate(r.lastDate)}</td>
              <td className="pr-2">
                <a href={detailHref[r.id]} onClick={(e) => e.stopPropagation()} aria-label={`${r.name} konu analizi`} className="flex h-9 w-9 items-center justify-center text-zinc-400 hover:text-[#1B6B8A]">
                  <ChevronRight className="h-4 w-4" />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Ders bazlı başarı: her zaman yatay bar (radar az derste anlamsız). */
export function SubjectSuccessBar({ rows }: { rows: { name: string; success: number; questions: number; color: string | null }[] }) {
  const height = Math.max(140, rows.length * 34 + 30)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#52525b" }} tickFormatter={(v) => `%${v}`} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#52525b" }} width={110} />
        <Tooltip
          cursor={{ fill: "#f4f4f5" }}
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
          formatter={(v, _n, item) => [`%${Number(v).toLocaleString("tr-TR")} (${(item.payload as { questions: number }).questions} soru)`, "Başarı"]}
        />
        <Bar dataKey="success" radius={[0, 4, 4, 0]} barSize={18} label={{ position: "right", fontSize: 11, fill: "#52525b", formatter: (v: unknown) => `%${v}` }}>
          {rows.map((r) => (
            <Cell key={r.name} fill={r.success < 50 ? "#ef4444" : r.success <= 70 ? "#f59e0b" : "#10b981"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
