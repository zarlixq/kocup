"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  complianceTone,
  COMPLIANCE_TONE_CLASS,
} from "@/lib/analytics/compliance"

export type CoachPerformanceRow = {
  id: string
  full_name: string
  email: string
  /** auth.users.last_sign_in_at (org_coach_last_login RPC) — hiç girmediyse null. */
  lastSignInAt: string | null
  totalStudents: number
  activeStudents: number
  avgQuestionsPerActive: number
  /** Bu hafta program açılmış aktif öğrenci sayısı. */
  studentsWithProgram: number
  /** Programı olan aktif öğrencilerin ortalama uyum yüzdesi (yoksa null). */
  weeklyComplianceAvg: number | null
  /** Son 30 günde görüşme/geri bildirim notu bırakılmış randevu sayısı. */
  feedbackCount: number
}

type Props = {
  rows: CoachPerformanceRow[]
  /** Koç detay link kökü (kurum/müdür). */
  hrefPrefix?: string
}

type SortKey =
  | "name"
  | "lastSignInAt"
  | "totalStudents"
  | "activeStudents"
  | "avgQuestionsPerActive"
  | "studentsWithProgram"
  | "weeklyComplianceAvg"
  | "feedbackCount"

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "name", label: "Koç" },
  { key: "lastSignInAt", label: "Son Giriş", align: "right" },
  { key: "totalStudents", label: "Öğrenci", align: "right" },
  { key: "activeStudents", label: "Aktif", align: "right" },
  { key: "avgQuestionsPerActive", label: "Ort. Soru / Aktif", align: "right" },
  { key: "studentsWithProgram", label: "Bu Hafta Program", align: "right" },
  { key: "weeklyComplianceAvg", label: "Ort. Uyum", align: "right" },
  { key: "feedbackCount", label: "Geri Bildirim (30g)", align: "right" },
]

function initials(name: string) {
  return name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()
}

function getAvgQuestionsToneClass(avg: number, hasStudents: boolean): string {
  if (!hasStudents) return "text-zinc-400"
  if (avg >= 200) return "text-green-700 font-semibold"
  if (avg >= 80) return "text-zinc-700"
  return "text-[#F97316] font-semibold"
}

/** "Son giriş" için göreli/kısa etiket. Hiç girmediyse "Hiç". */
function formatLastSignIn(iso: string | null): { label: string; tone: string } {
  if (!iso) return { label: "Hiç", tone: "text-zinc-400" }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { label: "—", tone: "text-zinc-400" }
  const diffMs = Date.now() - d.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)
  let label: string
  if (diffDays <= 0) label = "Bugün"
  else if (diffDays === 1) label = "Dün"
  else if (diffDays < 30) label = `${diffDays} gün önce`
  else
    label = d.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  const tone =
    diffDays <= 3
      ? "text-green-700"
      : diffDays <= 14
        ? "text-zinc-700"
        : "text-[#F97316] font-medium"
  return { label, tone }
}

/** Sıralama için sayısal anahtar (null'lar en sona). "name" ayrı ele alınır. */
function sortValue(r: CoachPerformanceRow, key: Exclude<SortKey, "name">): number {
  switch (key) {
    case "lastSignInAt":
      return r.lastSignInAt ? new Date(r.lastSignInAt).getTime() : -1
    case "weeklyComplianceAvg":
      return r.weeklyComplianceAvg ?? -1
    default:
      return r[key]
  }
}

export function CoachPerformanceTable({ rows, hrefPrefix = "/kurum/koclar" }: Props) {
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
        av = sortValue(a, sortKey)
        bv = sortValue(b, sortKey)
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
          {sorted.map((r) => {
            const signIn = formatLastSignIn(r.lastSignInAt)
            const compTone = complianceTone(r.weeklyComplianceAvg)
            return (
              <tr
                key={r.id}
                className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`${hrefPrefix}/${r.id}`}
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
                <td className={cn("px-4 py-3 text-right tabular-nums whitespace-nowrap", signIn.tone)}>
                  {signIn.label}
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
                  {r.activeStudents > 0
                    ? Math.round(r.avgQuestionsPerActive).toLocaleString("tr-TR")
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                  <span className="text-zinc-700">{r.studentsWithProgram}</span>
                  <span className="text-zinc-400 text-xs ml-1">/ {r.activeStudents}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  {r.weeklyComplianceAvg === null ? (
                    <span className="text-zinc-400 tabular-nums">—</span>
                  ) : (
                    <span
                      className={cn(
                        "inline-block rounded-md px-2 py-0.5 text-xs font-medium tabular-nums",
                        COMPLIANCE_TONE_CLASS[compTone],
                      )}
                    >
                      %{Math.round(r.weeklyComplianceAvg)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {r.feedbackCount > 0 ? (
                    <span className="text-zinc-700">{r.feedbackCount}</span>
                  ) : (
                    <span className="text-zinc-400">0</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
