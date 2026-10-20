import { UPPLAN_SQL_CONFIG as C } from "@/lib/upplan/config"
import { isErrorType, type ErrorType } from "@/lib/yanlis-defteri/constants"

// Ustalık skoru — saf fonksiyonlar.
// DB hesabı SQL'dedir (migration 209: compute_topic_mastery / effective_mastery).
// Buradaki computeMastery aynı formülün TS aynasıdır: testler formülü belgeler,
// UI etiket/güven/unutma kararlarını aynı eşiklerle verir.

export type SelfAssessment = "hic_gormedim" | "eksik" | "biliyorum"
export const SELF_ASSESSMENTS: readonly SelfAssessment[] = ["hic_gormedim", "eksik", "biliyorum"]
export const SELF_ASSESSMENT_LABEL: Record<SelfAssessment, string> = {
  hic_gormedim: "Hiç görmedim",
  eksik: "Eksik",
  biliyorum: "Biliyorum",
}

export function isSelfAssessment(v: unknown): v is SelfAssessment {
  return v === "hic_gormedim" || v === "eksik" || v === "biliyorum"
}

export type MasteryLabel = "zayif" | "gelisiyor" | "iyi"
export const MASTERY_LABEL_TEXT: Record<MasteryLabel, string> = {
  zayif: "Zayıf",
  gelisiyor: "Gelişiyor",
  iyi: "İyi",
}
export const MASTERY_TONE: Record<MasteryLabel, { bar: string; text: string; chip: string }> = {
  zayif: { bar: "bg-red-500", text: "text-red-700", chip: "bg-red-50 text-red-700" },
  gelisiyor: { bar: "bg-amber-500", text: "text-amber-700", chip: "bg-amber-50 text-amber-700" },
  iyi: { bar: "bg-emerald-500", text: "text-emerald-700", chip: "bg-emerald-50 text-emerald-700" },
}

export type MasteryConfidence = "dusuk" | "orta" | "yuksek"
export const MASTERY_CONFIDENCE_TEXT: Record<MasteryConfidence, string> = {
  dusuk: "Düşük güven",
  orta: "Orta güven",
  yuksek: "Yüksek güven",
}

export function isMasteryLabel(v: unknown): v is MasteryLabel {
  return v === "zayif" || v === "gelisiyor" || v === "iyi"
}

export function isMasteryConfidence(v: unknown): v is MasteryConfidence {
  return v === "dusuk" || v === "orta" || v === "yuksek"
}

const round2 = (n: number) => Math.round(n * 100) / 100

function daysBetween(fromIso: string, toIso: string): number {
  const ms = Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)
  return Math.round(ms / 86_400_000)
}

/** Öncül (0-100) ve ağırlığı. */
export function priorFor(assessment: SelfAssessment | null): { p0: number; w0: number } {
  if (!assessment) return { p0: C.prior_none, w0: C.prior_none_weight }
  const p0 = { hic_gormedim: C.prior_hic_gormedim, eksik: C.prior_eksik, biliyorum: C.prior_biliyorum }[assessment]
  return { p0, w0: C.prior_weight }
}

export function penalty(t: ErrorType | null): number {
  return t === "islem_hatasi" || t === "dikkat_okuma" || t === "sure_yetmedi" ? C.penalty_half : C.penalty_full
}

export type MasteryEvidence =
  | {
      kind: "session"
      date: string
      correct: number
      wrong: number
      empty: number
      /** Bu oturuma bağlı yanlış defteri satırlarının tipleri (wrong'un alt kümesi). */
      typed: ErrorType[]
    }
  | { kind: "exam_wrong"; date: string; errorType: ErrorType | null }
  | { kind: "loose_wrong"; date: string; errorType: ErrorType | null }
  /** Başka konudaki sorunun yanlışı, bu konunun atomuna bağlı (migration 215). */
  | { kind: "cross_wrong"; date: string; errorType: ErrorType | null }

/** SQL compute_topic_mastery'nin aynası. */
export function computeMastery(
  assessment: SelfAssessment | null,
  evidence: MasteryEvidence[],
  asOf: string,
): { mastery: number; evidenceW: number; lastPracticedAt: string | null } {
  const { p0, w0 } = priorFor(assessment)
  let wn = 0
  let ws = 0
  let last: string | null = null
  for (const e of evidence) {
    if (e.date > asOf) continue
    let n: number
    let f: number
    if (e.kind === "session") {
      n = e.correct + e.wrong + e.empty
      const typedPen = e.typed.reduce((s, t) => s + penalty(t), 0)
      f = Math.min(n, (e.wrong - e.typed.length) * C.penalty_full + typedPen + e.empty * C.empty_penalty)
    } else if (e.kind === "exam_wrong") {
      n = C.exam_wrong_weight
      f = C.exam_wrong_weight * penalty(e.errorType)
    } else if (e.kind === "cross_wrong") {
      n = C.cross_atom_weight
      f = C.cross_atom_weight * penalty(e.errorType)
    } else {
      n = 1
      f = penalty(e.errorType)
    }
    const lam = Math.pow(0.5, Math.max(daysBetween(e.date, asOf), 0) / C.evidence_half_life_days)
    wn += lam * n
    ws += lam * (n - f)
    if (!last || e.date > last) last = e.date
  }
  return {
    mastery: round2((100 * (w0 * (p0 / 100) + ws)) / (w0 + wn)),
    evidenceW: round2(wn),
    lastPracticedAt: last,
  }
}

/** SQL effective_mastery'nin aynası: son çalışmadan beri yavaş düşüş, taban = %60. */
export function effectiveMastery(stored: number, lastPracticedAt: string | null, asOf: string): number {
  if (!lastPracticedAt) return stored
  const floor = stored * C.forget_floor_ratio
  const days = Math.max(daysBetween(lastPracticedAt, asOf), 0)
  return round2(floor + (stored - floor) * Math.pow(0.5, days / C.forget_half_life_days))
}

export function masteryLabel(effective: number): MasteryLabel {
  if (effective >= C.label_iyi) return "iyi"
  if (effective >= C.label_gelisiyor) return "gelisiyor"
  return "zayif"
}

export function masteryConfidence(evidenceW: number): MasteryConfidence {
  if (evidenceW >= C.confidence_yuksek) return "yuksek"
  if (evidenceW >= C.confidence_orta) return "orta"
  return "dusuk"
}

export function isForgetting(stored: number, effective: number): boolean {
  return effective < stored * C.forgetting_flag_ratio
}

export function daysSince(dateIso: string, todayIso: string): number {
  return Math.max(daysBetween(dateIso, todayIso), 0)
}

// ── breakdown jsonb → tip ───────────────────────────────────────────────
export type MasteryBreakdown = {
  assessment: SelfAssessment | null
  prior: number
  sessionCount: number
  sessionQuestions: number
  sessionAccuracy: number | null
  examWrongs: number
  looseWrongs: number
  /** Başka konulardaki sorularda bu konunun bilgisinden yapılan yanlış. */
  crossWrongs: number
  wrongsByType: { type: ErrorType | null; count: number }[]
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback
}

export function parseBreakdown(raw: unknown): MasteryBreakdown {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const byType = o.wrongs_by_type && typeof o.wrongs_by_type === "object" ? (o.wrongs_by_type as Record<string, unknown>) : {}
  return {
    assessment: isSelfAssessment(o.assessment) ? o.assessment : null,
    prior: num(o.prior, C.prior_none),
    sessionCount: num(o.session_count),
    sessionQuestions: num(o.session_questions),
    sessionAccuracy: typeof o.session_accuracy === "number" ? o.session_accuracy : null,
    examWrongs: num(o.exam_wrongs),
    looseWrongs: num(o.loose_wrongs),
    crossWrongs: num(o.cross_wrongs),
    wrongsByType: Object.entries(byType)
      .map(([k, v]) => ({ type: isErrorType(k) ? k : null, count: num(v) }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count),
  }
}
