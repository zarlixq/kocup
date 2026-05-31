"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type CoachPerformanceRow = {
  id: string
  full_name: string
  email: string
  totalStudents: number
  activeStudents: number
  avgQuestionsPerActive: number
  completedAppointments: number
  totalAppointments: number
  completionRate: number
}

type Props = {
  rows: CoachPerformanceRow[]
}

type SortKey =
  | "name"
  | "totalStudents"
  | "activeStudents"
  | "avgQuestionsPerActive"
  | "completedAppointments"
  | "completionRate"

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "name", label: "Koç" },
  { key: "totalStudents", label: "Toplam Öğrenci", align: "right" },
  { key: "activeStudents", label: "Aktif Öğrenci", align: "right" },
  { key: "avgQuestionsPerActive", label: "Ort. Soru / Aktif Öğrenci", align: "right" },
  { key: "completedAppointments", label: "Tamamlanan Randevu (30g)", align: "right" },
  { key: "completionRate", label: "Tutulan Randevu %", align: "right" },
]

function initials(name: string) {
  return name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()
}

function getCompletionToneClass(rate: number, hasAppts: boolean): string {
  if (!hasAppts) return "text-zinc-400"
  if (rate >= 85) return "text-green-700 font-semibold"
  if (rate >= 60) return "text-zinc-700"
  return "text-[#F97316] font-semibold"
}

function getAvgQuestionsToneClass(avg: number, hasStudents: boolean): string {
  if (!hasStudents) return "text-zinc-400"
  if (avg >= 200) return "text-green-700 font-semibold"
  if (avg >= 80) return "text-zinc-700"
  return "text-[#F97316] font-semibold"
}

export function CoachPerformanceTable({ rows }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("activeStudents")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const sorted = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      let av: string | number
      let bv: string | number
      if (sortKey === "name") {
        av = a.full_name.toLocaleLowerCase("tr-TR")
        bv = b.full_name.toLocaleLowerCase("tr-TR")
      } else {
        av = a[sortKey] as number
        bv = b[sortKey] as number
      }
      if (av === bv) return 0
      const cmp = av > bv ? 1 : -1
      return sortDir === "asc" ? cmp : -cmp
    })
    return copy
  }, [rows, sortKey, sortDir])

  function handleSort(k: SortKey) {
    if (k === sortKey) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(k)
      setSortDir(k === "name" ? "asc" : "desc")
    }
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white border border-zinc-200 rounded-2xl p-8 text-center text-sm text-zinc-500">
        Henüz koç yok.
      </div>
    )
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-zinc-200 bg-zinc-50/60">
            {COLUMNS.map((c) => {
              const active = sortKey === c.key
              return (
                <th
                  key={c.key}
                  className={cn(
                    "px-4 py-3 font-medium text-zinc-700 whitespace-nowrap",
                    c.align === "right" ? "text-right" : "text-left",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleSort(c.key)}
                    className={cn(
                      "inline-flex items-center gap-1 hover:text-[#1B6B8A]",
                      c.align === "right" ? "ml-auto" : "",
                    )}
                  >
                    {c.label}
                    {active ? (
                      sortDir === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                    )}
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr
              key={r.id}
              className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/kurum/koclar/${r.id}`}
                  className="flex items-center gap-3 hover:opacity-80"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-[#1B6B8A] text-white text-xs">
                      {initials(r.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="font-medium text-zinc-900 truncate">{r.full_name}</div>
                    <div className="text-xs text-zinc-500 truncate">{r.email}</div>
                  </div>
                </Link>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{r.totalStudents}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {r.activeStudents > 0 ? (
                  <Badge variant="paid" className="font-mono">
                    {r.activeStudents}
                  </Badge>
                ) : (
                  <span className="text-zinc-400">0</span>
                )}
              </td>
              <td
                className={cn(
                  "px-4 py-3 text-right tabular-nums",
                  getAvgQuestionsToneClass(r.avgQuestionsPerActive, r.activeStudents > 0),
                )}
              >
                {r.activeStudents > 0 ? Math.round(r.avgQuestionsPerActive).toLocaleString("tr-TR") : "—"}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                <span className="text-zinc-700">{r.completedAppointments}</span>
                <span className="text-zinc-400 text-xs ml-1">/ {r.totalAppointments}</span>
              </td>
              <td
                className={cn(
                  "px-4 py-3 text-right tabular-nums",
                  getCompletionToneClass(r.completionRate, r.totalAppointments > 0),
                )}
              >
                {r.totalAppointments > 0 ? `%${r.completionRate.toFixed(0)}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
