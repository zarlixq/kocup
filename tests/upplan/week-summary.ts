import { fromHHMM, type DraftItem } from "@/lib/upplan/scheduler"

// Haftalık program özeti (testler, önce/sonra karşılaştırması, debug).

export type WeekSummary = {
  totalMinutes: number
  bySubject: Record<string, number>
  byKind: { konu: number; video: number; soru: number; tekrar: number; analiz: number; deneme: number }
  shares: { konu: number; soru: number; tekrarAnaliz: number }
  blocks: number
}

const minutes = (i: Pick<DraftItem, "start_time" | "end_time">) => fromHHMM(i.end_time) - fromHHMM(i.start_time)

export function kindOf(i: DraftItem): keyof WeekSummary["byKind"] {
  if (i.block_type === "deneme") return "deneme"
  if (i.baslik.startsWith("Video:")) return "video"
  if (i.baslik.startsWith("Deneme analizi")) return "analiz"
  if (i.block_type === "konu_calisma") return "konu"
  if (i.block_type === "tekrar" || i.baslik.startsWith("Kısa konu tekrarı")) return "tekrar"
  return "soru"
}

export function summarizeWeek(items: DraftItem[], subjectNames: Map<string, string>): WeekSummary {
  const byKind = { konu: 0, video: 0, soru: 0, tekrar: 0, analiz: 0, deneme: 0 }
  const bySubject: Record<string, number> = {}
  for (const i of items) {
    const m = minutes(i)
    byKind[kindOf(i)] += m
    if (i.block_type === "deneme") continue
    const name = i.subject_id ? (subjectNames.get(i.subject_id) ?? i.subject_id) : "(dersiz)"
    bySubject[name] = (bySubject[name] ?? 0) + m
  }
  const study = byKind.konu + byKind.video + byKind.soru + byKind.tekrar + byKind.analiz
  const r = (n: number) => (study > 0 ? Math.round((n / study) * 1000) / 1000 : 0)
  return {
    totalMinutes: study,
    bySubject,
    byKind,
    shares: { konu: r(byKind.konu + byKind.video), soru: r(byKind.soru), tekrarAnaliz: r(byKind.tekrar + byKind.analiz) },
    blocks: items.filter((i) => i.block_type !== "deneme").length,
  }
}
