import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { istanbulDaysAgoStr } from "@/lib/tz"

type Client = SupabaseClient<Database>

// ─────────────────────────────────────────────────────────────────────────
// ÖĞRENCİ SKOR TABLOSU (müdür leaderboard) — aktiflik çarpanı TEK YER
// ─────────────────────────────────────────────────────────────────────────
// Ham metriği (çözülen soru / net / aktiflik) aktiflikle ağırlıklandırır.
// AĞIRLIKLAR YALNIZ BURADAN değiştirilir; UI ve hesap tek kaynaktan okur.
// ─────────────────────────────────────────────────────────────────────────

/** Aktiflik penceresi (gün). active_days son bu kadar günden sayılır. */
export const ACTIVITY_WINDOW_DAYS = 30

/**
 * Aktiflik çarpanı ağırlıkları — TEK değiştirme noktası.
 *   activityCoefficient = activeRatio * ratioWeight + streakBonus
 *   score = baseMetric * (1 + activityCoefficient)
 *
 * - activeRatio: son ACTIVITY_WINDOW_DAYS içinde aktif gün oranı (0–1).
 * - ratioWeight: aktif gün oranının katkı ağırlığı (0.5 → tam aktif +%50).
 * - streakBonusMax / streakFullDays: opsiyonel streak bonusu; şu an aktif gün
 *   sayısı streakFullDays'e ulaşınca streakBonusMax'a doğru doğrusal artar.
 *   (Ayrı bir streak kolonu olmadığından aktif gün sayısını streak proxy'si
 *    olarak kullanırız — istenirse streakBonusMax=0 ile kapatılır.)
 */
export const ACTIVITY_WEIGHTS = {
  ratioWeight: 0.5,
  streakBonusMax: 0.1,
  streakFullDays: 20,
} as const

/** Aktiflik katsayısı [0, ratioWeight + streakBonusMax]. */
export function activityCoefficient(activeDays: number): number {
  const ratio = Math.min(1, Math.max(0, activeDays / ACTIVITY_WINDOW_DAYS))
  const streak = Math.min(1, Math.max(0, activeDays / ACTIVITY_WEIGHTS.streakFullDays))
  return ratio * ACTIVITY_WEIGHTS.ratioWeight + streak * ACTIVITY_WEIGHTS.streakBonusMax
}

/** score = base * (1 + katsayı). multiplierOn=false → ham metrik. */
export function applyActivityMultiplier(
  base: number,
  activeDays: number,
  multiplierOn: boolean,
): number {
  if (!multiplierOn) return base
  return base * (1 + activityCoefficient(activeDays))
}

// ── Sıralama metrikleri ──────────────────────────────────────────────────
export type ScoreMetric = "questions" | "net" | "activity"

export const SCORE_METRICS: { key: ScoreMetric; label: string; help: string }[] = [
  { key: "questions", label: "Çözülen Soru", help: "Son 30 günde çözülen toplam soru" },
  { key: "net", label: "Son Deneme Net", help: "En güncel denemenin net toplamı" },
  { key: "activity", label: "Aktiflik Skoru", help: "Son 30 gündeki aktif gün sayısı" },
]

export const DEFAULT_SCORE_METRIC: ScoreMetric = "questions"
/** Aktiflik çarpanı varsayılan olarak AÇIK. */
export const DEFAULT_MULTIPLIER_ON = true

export type ScoreboardStatRaw = {
  student_id: string
  questions: number
  correct: number
  active_days: number
  last_exam_net: number | null
}

// ── Aktiflik durumu segmentleri (aktif / az aktif / pasif) — TEK YER ──────
// Dağılım grafikleri ve koç panelleri bu eşikleri paylaşır (kopyalama yok).
// Segment son SEGMENT_WINDOW_DAYS gündeki aktif gün sayısından belirlenir:
//   aktif   → yarıdan fazla gün aktif (≥ 4/7)
//   az aktif→ en az bir gün aktif (1–3/7)
//   pasif   → hiç aktif gün yok (0/7)
export const ACTIVITY_SEGMENT_WINDOW_DAYS = 7

export type ActivitySegment = "active" | "low" | "inactive"

export function activitySegment(activeDaysInWindow: number): ActivitySegment {
  if (activeDaysInWindow >= 4) return "active"
  if (activeDaysInWindow >= 1) return "low"
  return "inactive"
}

export const ACTIVITY_SEGMENT_META: Record<
  ActivitySegment,
  { label: string; color: string }
> = {
  active: { label: "Aktif", color: "#10b981" },
  low: { label: "Az Aktif", color: "#F97316" },
  inactive: { label: "Pasif", color: "#94a3b8" },
}

export const ACTIVITY_SEGMENT_ORDER: ActivitySegment[] = ["active", "low", "inactive"]

export type ScoredStudent = {
  studentId: string
  questions: number
  correct: number
  activeDays: number
  lastExamNet: number | null
  /** Seçili metriğin ham değeri (çarpan uygulanmadan). */
  baseMetric: number
  /** Çarpan uygulanmış nihai skor (multiplierOn=false ise = baseMetric). */
  score: number
}

function baseForMetric(metric: ScoreMetric, s: ScoreboardStatRaw): number {
  switch (metric) {
    case "questions":
      return s.questions
    case "net":
      return s.last_exam_net ?? 0
    case "activity":
      return s.active_days
  }
}

/**
 * Ham skor istatistiklerini seçili metrik + çarpana göre skorla ve azalan sırala.
 * Not: "activity" metriğinde çarpan kavramsal olarak kendini ikiler; bu yüzden
 * aktiflik metriği seçiliyken çarpan uygulanmaz (baseMetric = active_days).
 */
export function scoreAndRank(
  rows: ScoreboardStatRaw[],
  metric: ScoreMetric,
  multiplierOn: boolean,
): ScoredStudent[] {
  const applyMult = multiplierOn && metric !== "activity"
  return rows
    .map((s) => {
      const baseMetric = baseForMetric(metric, s)
      return {
        studentId: s.student_id,
        questions: s.questions,
        correct: s.correct,
        activeDays: s.active_days,
        lastExamNet: s.last_exam_net,
        baseMetric,
        score: applyActivityMultiplier(baseMetric, s.active_days, applyMult),
      }
    })
    .sort((a, b) => b.score - a.score)
}

/**
 * Müdür kapsamındaki (RLS: tüm platform) öğrenci skor istatistikleri.
 * sinceDays gün öncesinden bugüne (Istanbul takvimi).
 */
export async function getScoreboardStats(
  supabase: Client,
  sinceDays: number = ACTIVITY_WINDOW_DAYS,
): Promise<ScoreboardStatRaw[]> {
  const since = istanbulDaysAgoStr(sinceDays - 1)
  const { data, error } = await supabase.rpc("student_scoreboard_stats", { p_since: since })
  if (error) {
    console.error("student_scoreboard_stats hatası:", error)
    return []
  }
  return (data ?? []).map((r) => ({
    student_id: r.student_id,
    questions: Number(r.questions ?? 0),
    correct: Number(r.correct ?? 0),
    active_days: Number(r.active_days ?? 0),
    last_exam_net: r.last_exam_net === null ? null : Number(r.last_exam_net),
  }))
}
