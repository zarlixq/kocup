import { DIRECT_UTM } from "@/lib/bireysel/overview"

// Kampanya hunisi — saf hesaplar. Kaynak satırlar campaign_funnel() RPC'sinden (migration 226).

export type FunnelRow = {
  utm_source: string | null
  utm_campaign: string | null
  visits: number
  signups: number
  setups: number
  first_questions: number
}

export type FunnelViewRow = FunnelRow & {
  key: string
  sourceLabel: string
  campaignLabel: string
  /** Kayıt / ziyaret (%); ziyaret yoksa null. */
  signupRate: number | null
  setupRate: number | null
  firstQuestionRate: number | null
}

function rate(n: number, d: number): number | null {
  return d === 0 ? null : Math.round((n / d) * 100)
}

function view(r: FunnelRow, key: string, sourceLabel: string, campaignLabel: string): FunnelViewRow {
  return {
    ...r,
    key,
    sourceLabel,
    campaignLabel,
    signupRate: rate(r.signups, r.visits),
    setupRate: rate(r.setups, r.signups),
    firstQuestionRate: rate(r.first_questions, r.signups),
  }
}

/** Satırlar + en altta toplam ("Toplam"). Sıra: kayıt, sonra ziyaret azalan. */
export function funnelTable(rows: FunnelRow[]): { rows: FunnelViewRow[]; total: FunnelViewRow } {
  const sorted = [...rows].sort((a, b) => b.signups - a.signups || b.visits - a.visits)
  const total = rows.reduce<FunnelRow>(
    (acc, r) => ({
      ...acc,
      visits: acc.visits + r.visits,
      signups: acc.signups + r.signups,
      setups: acc.setups + r.setups,
      first_questions: acc.first_questions + r.first_questions,
    }),
    { utm_source: null, utm_campaign: null, visits: 0, signups: 0, setups: 0, first_questions: 0 },
  )
  return {
    rows: sorted.map((r) =>
      view(r, `${r.utm_source ?? ""}|${r.utm_campaign ?? ""}`, r.utm_source?.trim() || DIRECT_UTM, r.utm_campaign?.trim() || "—"),
    ),
    total: view(total, "__total__", "Toplam", ""),
  }
}
