import Link from "next/link"
import { NotebookPen, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/format"
import { istanbulDateStr } from "@/lib/tz"
import { addDays } from "@/lib/soru-cozum/summary"
import { loadGapMap, loadWrongList } from "@/lib/yanlis-defteri/load"
import { GapMapView } from "@/components/yanlis-defteri/gap-map-view"
import { WrongAnswersList, type WrongListGroup } from "@/components/yanlis-defteri/wrong-answers-list"
import { OpenWrongPanelButton } from "@/components/yanlis-defteri/open-wrong-panel-button"

export const metadata = { title: "Yanlış Defteri — KoçUp" }

type Tab = "harita" | "kayitlar"

function dayLabel(date: string, today: string) {
  if (date === today) return "Bugün"
  if (date === addDays(today, -1)) return "Dün"
  return formatDate(date, "dd.MM.yyyy, EEEE")
}

export default async function YanlisDefteriPage({
  searchParams,
}: {
  searchParams: Promise<{ sekme?: string }>
}) {
  const sp = await searchParams
  const tab: Tab = sp.sekme === "kayitlar" ? "kayitlar" : "harita"
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userId = user!.id
  const today = istanbulDateStr()

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Yanlış Defteri</h1>
          <p className="mt-1 text-sm text-zinc-500">Yanlışlarının nedeni ve hangi bilgide açığın olduğu.</p>
        </div>
        <Button asChild variant="accent" className="shrink-0">
          <Link href="/ogrenci/soru-cozum/yeni">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Soru kaydı</span>
            <span className="sm:hidden">Ekle</span>
          </Link>
        </Button>
      </div>

      <nav className="inline-flex rounded-xl bg-zinc-100 p-1 text-sm" aria-label="Yanlış defteri sekmeleri">
        {(
          [
            ["harita", "Açık Haritası"],
            ["kayitlar", "Kayıtlar"],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={key === "harita" ? "/ogrenci/yanlis-defteri" : "/ogrenci/yanlis-defteri?sekme=kayitlar"}
            className={cn(
              "rounded-lg px-4 py-1.5 font-medium transition-colors",
              tab === key ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900",
            )}
            aria-current={tab === key ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tab === "harita" ? (
        <GapMapView data={await loadGapMap(supabase, userId)} mode="student" emptyHref="/ogrenci/soru-cozum/yeni" />
      ) : (
        <RecordsTab supabase={supabase} userId={userId} today={today} />
      )}
    </div>
  )
}

async function RecordsTab({
  supabase,
  userId,
  today,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  today: string
}) {
  const data = await loadWrongList(supabase, userId)
  const groupsMap = new Map<string, WrongListGroup>()
  for (const it of data.items) {
    const g = groupsMap.get(it.date) ?? { date: it.date, label: dayLabel(it.date, today), items: [] }
    g.items.push(it)
    groupsMap.set(it.date, g)
  }
  const groups = Array.from(groupsMap.values()).sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <div className="space-y-6">
      {data.pendingSessions.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-900">Deftere girilmemiş yanlışlar</h2>
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-orange-200 bg-orange-50/40">
            {data.pendingSessions.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-zinc-900">{s.label || "Soru kaydı"}</div>
                  <div className="text-xs text-zinc-500 tabular-nums">
                    {formatDate(s.date, "dd.MM.yyyy")} · {s.wrong - s.recorded} yanlış girilmedi
                  </div>
                </div>
                <OpenWrongPanelButton sessionId={s.id} label={`${formatDate(s.date, "dd.MM.yyyy")} · ${s.label}`} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center">
          <NotebookPen className="mx-auto mb-3 h-6 w-6 text-zinc-300" />
          <h3 className="text-sm font-semibold text-zinc-900">Henüz yanlış kaydın yok</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Soru çözüm kaydı ekledikten sonra &quot;Yanlışlarını ekle&quot; ile nedenlerini işaretle.
          </p>
        </div>
      ) : (
        <WrongAnswersList groups={groups} />
      )}
    </div>
  )
}
