import { BookOpen, Flame, Hash, Target, TrendingDown, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import type { WeeklySummary } from "@/lib/soru-cozum/summary"

function Card({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
  sub: React.ReactNode
  accent?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 min-w-0",
        accent ? "border-orange-200 bg-gradient-to-br from-orange-50 to-white" : "border-zinc-200 bg-white",
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
        <Icon className={cn("h-3.5 w-3.5", accent ? "text-[#F97316]" : "text-zinc-400")} />
        {label}
      </div>
      <div className="mt-2 truncate text-2xl font-bold tabular-nums text-zinc-900">{value}</div>
      <div className="mt-1 truncate text-xs text-zinc-500">{sub}</div>
    </div>
  )
}

export function SummaryCards({
  summary,
  streak,
}: {
  summary: WeeklySummary
  streak: { days: number; activeToday: boolean }
}) {
  const diff = summary.total - summary.prevTotal
  const diffNode =
    summary.prevTotal === 0 && summary.total === 0 ? (
      "Bu hafta henüz kayıt yok"
    ) : diff === 0 ? (
      "Geçen haftayla aynı"
    ) : (
      <span className={cn("inline-flex items-center gap-1", diff > 0 ? "text-emerald-600" : "text-red-600")}>
        {diff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {diff > 0 ? "+" : ""}
        {diff.toLocaleString("tr-TR")} geçen haftaya göre
      </span>
    )

  const streakSub =
    streak.days === 0
      ? "Bugün bir kayıt girerek başla"
      : streak.activeToday
        ? "Bugün de çalıştın, devam!"
        : "Bugün kayıt gir, seri bozulmasın"

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card icon={Hash} label="Bu hafta soru" value={summary.total.toLocaleString("tr-TR")} sub={diffNode} />
      <Card
        icon={Target}
        label="Doğruluk"
        value={summary.accuracy == null ? "—" : `%${summary.accuracy}`}
        sub={summary.accuracy == null ? "Henüz veri yok" : `${summary.correct.toLocaleString("tr-TR")} doğru`}
      />
      <Card
        icon={BookOpen}
        label="En çok çalışılan"
        value={<span className="text-lg sm:text-xl">{summary.topSubject?.name ?? "—"}</span>}
        sub={summary.topSubject ? `${summary.topSubject.total.toLocaleString("tr-TR")} soru` : "Bu hafta kayıt yok"}
      />
      <Card
        icon={Flame}
        label="Günlük seri"
        value={`${streak.days} gün`}
        sub={streakSub}
        accent={streak.days > 0}
      />
    </div>
  )
}
