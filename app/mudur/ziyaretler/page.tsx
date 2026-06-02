import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { Eye, MousePointerClick, Send, Users } from "lucide-react"
import { getCurrentProfile } from "@/lib/auth/current-user"
import { createClient } from "@/lib/supabase/server"
import { TOOLS } from "@/lib/tools/config"
import {
  computeRange,
  isValidRange,
  RANGE_LABELS,
  type RangeKey,
} from "@/lib/analytics/range"
import { KpiCard } from "@/components/mudur/ziyaretler/kpi-card"
import { RangeSelector } from "@/components/mudur/ziyaretler/range-selector"
import { DailyAreaChart } from "@/components/mudur/ziyaretler/daily-area-chart"
import { ToolBarChart } from "@/components/mudur/ziyaretler/tool-bar-chart"
import { SourceDonut } from "@/components/mudur/ziyaretler/source-donut"
import { FunnelCard } from "@/components/mudur/ziyaretler/funnel-card"
import { TopPagesTable } from "@/components/mudur/ziyaretler/top-pages-table"
import { TopBlogTable } from "@/components/mudur/ziyaretler/top-blog-table"

export const metadata: Metadata = {
  title: "Ziyaretler",
  description: "Public site trafiği ve araç kullanım analizi.",
}

export const dynamic = "force-dynamic"

const TOOL_LABEL: Record<string, string> = Object.fromEntries(
  TOOLS.map((t) => [t.slug, t.shortTitle])
)

function fillDailyGaps(
  rows: { day: string; views: number; uniques: number }[],
  startMs: number,
  endMs: number
) {
  const map = new Map(rows.map((r) => [r.day, r]))
  const result: { day: string; label: string; views: number; uniques: number }[] = []
  const oneDay = 24 * 60 * 60 * 1000
  // İstanbul TZ'de günleri dolduruyoruz — RPC date_trunc Istanbul'a göre yapıyor.
  const startDate = new Date(startMs)
  startDate.setHours(0, 0, 0, 0)
  for (let t = startDate.getTime(); t < endMs + oneDay; t += oneDay) {
    const d = new Date(t)
    const day = format(d, "yyyy-MM-dd")
    const existing = map.get(day)
    result.push({
      day,
      label: format(d, "d MMM", { locale: tr }),
      views: existing?.views ?? 0,
      uniques: existing?.uniques ?? 0,
    })
  }
  return result
}

export default async function ZiyaretlerPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  // Layout guard zaten admin-only ama page-level guard belt+suspenders.
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "admin") redirect("/giris/mudur")

  const sp = await searchParams
  const range: RangeKey = isValidRange(sp.range) ? sp.range : "7"
  const { start, end, prevStart, days } = computeRange(range)

  const supabase = await createClient()

  const startIso = start.toISOString()
  const endIso = end.toISOString()
  const prevStartIso = prevStart.toISOString()

  const [
    kpisRes,
    dailyRes,
    topPagesRes,
    topBlogRes,
    toolsRes,
    sourcesRes,
    funnelRes,
  ] = await Promise.all([
    supabase.rpc("admin_pv_kpis", {
      p_start: startIso,
      p_end: endIso,
      p_prev_start: prevStartIso,
    }),
    supabase.rpc("admin_pv_daily", { p_start: startIso, p_end: endIso }),
    supabase.rpc("admin_pv_top_pages", {
      p_start: startIso,
      p_end: endIso,
      p_limit: 15,
    }),
    supabase.rpc("admin_pv_top_blog", {
      p_start: startIso,
      p_end: endIso,
      p_limit: 10,
    }),
    supabase.rpc("admin_pv_tool_breakdown", { p_start: startIso, p_end: endIso }),
    supabase.rpc("admin_pv_source_breakdown", {
      p_start: startIso,
      p_end: endIso,
    }),
    supabase.rpc("admin_pv_funnel", { p_start: startIso, p_end: endIso }),
  ])

  const k = kpisRes.data?.[0] ?? {
    total_views: 0,
    unique_visitors: 0,
    prev_total_views: 0,
    prev_unique_visitors: 0,
    tool_uses: 0,
    prev_tool_uses: 0,
    basvuru_views: 0,
    prev_basvuru_views: 0,
  }

  const filledDaily = fillDailyGaps(
    dailyRes.data ?? [],
    start.getTime(),
    end.getTime()
  )

  const tools = (toolsRes.data ?? []).map((t) => ({
    label: TOOL_LABEL[t.tool_slug ?? ""] ?? t.tool_slug ?? "Bilinmeyen",
    uses: t.uses,
    sessions: t.sessions,
  }))

  const sources = sourcesRes.data ?? []
  const funnel = funnelRes.data?.[0] ?? {
    total_sessions: 0,
    tool_or_blog_sessions: 0,
    converted_sessions: 0,
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 tracking-tight">
            Ziyaretler
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Public site trafiği ve araç kullanımı · {RANGE_LABELS[range]}
          </p>
        </div>
        <RangeSelector current={range} />
      </header>

      <section
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
        aria-label="Özet metrikler"
      >
        <KpiCard
          label="Toplam Ziyaret"
          value={k.total_views}
          prev={k.prev_total_views}
          icon={Eye}
          accent="primary"
        />
        <KpiCard
          label="Tekil Ziyaretçi"
          value={k.unique_visitors}
          prev={k.prev_unique_visitors}
          icon={Users}
          accent="violet"
        />
        <KpiCard
          label="Araç Kullanımı"
          value={k.tool_uses}
          prev={k.prev_tool_uses}
          icon={MousePointerClick}
          accent="orange"
        />
        <KpiCard
          label="Başvuru Görüntüleme"
          value={k.basvuru_views}
          prev={k.prev_basvuru_views}
          icon={Send}
          accent="emerald"
        />
      </section>

      <DailyAreaChart data={filledDaily} days={days} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <TopPagesTable rows={topPagesRes.data ?? []} />
        <TopBlogTable rows={topBlogRes.data ?? []} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        <ToolBarChart data={tools} />
        <SourceDonut data={sources} />
        <FunnelCard data={funnel} />
      </div>
    </div>
  )
}
