"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { Trophy, SlidersHorizontal, Zap } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ComplianceBadge } from "@/components/analytics/compliance-badge"
import {
  scoreAndRank,
  SCORE_METRICS,
  type ScoreMetric,
  type ScoreboardStatRaw,
} from "@/lib/analytics/scoreboard"
import {
  DASHBOARD_DEFAULTS,
  type DashboardPrefs,
  type DashboardColumns,
  type UiScope,
} from "@/lib/analytics/ui-preferences"
import { saveUiPreference } from "@/lib/analytics/ui-preferences-actions"

export type LeaderboardRow = ScoreboardStatRaw & {
  name: string
  coachName: string | null
  grade: string | null
  compliance: { percent: number | null; totalItems: number; doneItems: number } | null
}

const TOP_N_OPTIONS = [5, 10, 20, 50] as const

const COLUMN_LABELS: { key: keyof DashboardColumns; label: string }[] = [
  { key: "questions", label: "Çözülen Soru" },
  { key: "net", label: "Son Deneme Net" },
  { key: "activity", label: "Aktif Gün" },
  { key: "compliance", label: "Haftalık Uyum" },
]

export function StudentLeaderboard({
  rows,
  initialPrefs,
  hrefPrefix = "/mudur/ogrenciler",
  prefScope = "mudur_dashboard",
}: {
  rows: LeaderboardRow[]
  initialPrefs: DashboardPrefs
  /** Öğrenci profili link kökü — panel bazlı (müdür/kurum). */
  hrefPrefix?: string
  /** UI tercihlerinin kalıcı yazılacağı scope — panel bazlı. */
  prefScope?: UiScope
}) {
  const [prefs, setPrefs] = useState<DashboardPrefs>(initialPrefs)
  const [, startTransition] = useTransition()

  const byId = useMemo(() => new Map(rows.map((r) => [r.student_id, r])), [rows])

  const ranked = useMemo(() => {
    const scored = scoreAndRank(rows, prefs.metric, prefs.multiplierOn)
    return scored.slice(0, prefs.topN)
  }, [rows, prefs.metric, prefs.multiplierOn, prefs.topN])

  // Tercih değişince state'i güncelle + kalıcı kaydet (fire-and-forget).
  function update(next: DashboardPrefs) {
    setPrefs(next)
    startTransition(async () => {
      const res = await saveUiPreference(prefScope, next as unknown as Record<string, unknown>)
      if (!res.success) toast.error(res.error ?? "Tercih kaydedilemedi.")
    })
  }

  const cols = prefs.columns
  const multiplierActive = prefs.multiplierOn && prefs.metric !== "activity"

  return (
    <section className="bg-white border border-zinc-200 rounded-2xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-orange-50 text-[#F97316] flex items-center justify-center">
            <Trophy className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-semibold text-zinc-900">Öğrenci Sıralaması</h2>
            <p className="text-xs text-zinc-500">
              {SCORE_METRICS.find((m) => m.key === prefs.metric)?.label}
              {multiplierActive && " · aktiflik çarpanlı"} · son 30 gün
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="h-4 w-4" />
              Filtrele / Görünürlük
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Sıralama metriği</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={prefs.metric}
              onValueChange={(v) => update({ ...prefs, metric: v as ScoreMetric })}
            >
              {SCORE_METRICS.map((m) => (
                <DropdownMenuRadioItem
                  key={m.key}
                  value={m.key}
                  onSelect={(e) => e.preventDefault()}
                >
                  {m.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={prefs.multiplierOn}
              onCheckedChange={(c) => update({ ...prefs, multiplierOn: !!c })}
              onSelect={(e) => e.preventDefault()}
            >
              <span className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-[#F97316]" />
                Aktiflik çarpanı
              </span>
            </DropdownMenuCheckboxItem>
            <p className="px-2 pb-1 text-[11px] leading-tight text-zinc-400">
              Skor = metrik × (1 + aktiflik). Aktiflik metriğinde uygulanmaz.
            </p>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Görünen kolonlar</DropdownMenuLabel>
            {COLUMN_LABELS.map((c) => (
              <DropdownMenuCheckboxItem
                key={c.key}
                checked={cols[c.key]}
                onCheckedChange={(checked) =>
                  update({ ...prefs, columns: { ...cols, [c.key]: !!checked } })
                }
                onSelect={(e) => e.preventDefault()}
              >
                {c.label}
              </DropdownMenuCheckboxItem>
            ))}

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Gösterilecek öğrenci</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={String(prefs.topN)}
              onValueChange={(v) => update({ ...prefs, topN: Number(v) })}
            >
              {TOP_N_OPTIONS.map((n) => (
                <DropdownMenuRadioItem
                  key={n}
                  value={String(n)}
                  onSelect={(e) => e.preventDefault()}
                >
                  İlk {n}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {ranked.length === 0 ? (
        <div className="p-8 text-center text-sm text-zinc-500">
          Sıralanacak öğrenci verisi yok.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Öğrenci</TableHead>
                {cols.questions && <TableHead className="text-right">Soru</TableHead>}
                {cols.net && <TableHead className="text-right">Net</TableHead>}
                {cols.activity && <TableHead className="text-right">Aktif Gün</TableHead>}
                {cols.compliance && <TableHead className="text-right">Uyum</TableHead>}
                <TableHead className="text-right">Skor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranked.map((s, i) => {
                const r = byId.get(s.studentId)!
                return (
                  <TableRow key={s.studentId}>
                    <TableCell className="text-zinc-500 tabular-nums">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`${hrefPrefix}/${s.studentId}`}
                        className="font-medium text-zinc-900 hover:text-[#1B6B8A]"
                      >
                        {r.name}
                      </Link>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        {r.grade && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {r.grade === "Mezun" ? "Mezun" : `${r.grade}. Sınıf`}
                          </Badge>
                        )}
                        <span className="truncate">{r.coachName ?? "Koçsuz"}</span>
                      </div>
                    </TableCell>
                    {cols.questions && (
                      <TableCell className="text-right tabular-nums">
                        {r.questions.toLocaleString("tr-TR")}
                      </TableCell>
                    )}
                    {cols.net && (
                      <TableCell className="text-right tabular-nums">
                        {r.last_exam_net == null ? "—" : r.last_exam_net.toFixed(2)}
                      </TableCell>
                    )}
                    {cols.activity && (
                      <TableCell className="text-right tabular-nums">{r.active_days}</TableCell>
                    )}
                    {cols.compliance && (
                      <TableCell className="text-right">
                        <ComplianceBadge
                          percent={r.compliance?.percent ?? null}
                          totalItems={r.compliance?.totalItems}
                          doneItems={r.compliance?.doneItems}
                        />
                      </TableCell>
                    )}
                    <TableCell className="text-right font-semibold text-zinc-900 tabular-nums">
                      {prefs.metric === "net" ? s.score.toFixed(1) : Math.round(s.score).toLocaleString("tr-TR")}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}
