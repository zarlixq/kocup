// UpPlan katsayıları — TEK KAYNAK.
//
// UPPLAN_SQL_CONFIG: SQL hesabının (migration 207 upplan_config, 209
// fonksiyonları) kullandığı değerler. config.test.ts migration'daki seed
// satırlarını buradakiyle karşılaştırır; birini değiştirirsen yeni bir
// migration ile upplan_config'i de güncelle.
//
// Diğerleri yalnız uygulama katmanında kullanılır.

export const UPPLAN_SQL_CONFIG = {
  // Öncül (konu taraması), 0-100
  prior_hic_gormedim: 10,
  prior_eksik: 45,
  prior_biliyorum: 75,
  /** Taramalı öncülün soru eşdeğeri ağırlığı. */
  prior_weight: 20,
  /** Tarama yoksa öncül ve ağırlığı. */
  prior_none: 40,
  prior_none_weight: 5,
  /** Soru/deneme kanıtının yarı ömrü (gün). */
  evidence_half_life_days: 21,
  /** Deneme yanlışı kaç soru yanlışı sayılır. */
  exam_wrong_weight: 2,
  /** bilgi_eksik / hic_fikrim_yok / belirtilmemiş. */
  penalty_full: 1,
  /** islem_hatasi / dikkat_okuma / sure_yetmedi. */
  penalty_half: 0.5,
  empty_penalty: 1,
  /** Unutma: yarı ömür (gün) ve taban (saklanan skorun oranı). */
  forget_half_life_days: 45,
  forget_floor_ratio: 0.6,
  /** Ağırlıklı kanıt eşikleri (Σ λ·soru). */
  confidence_orta: 20,
  confidence_yuksek: 60,
  /** Etiket eşikleri (etkili skor). */
  label_gelisiyor: 40,
  label_iyi: 75,
  /** effective < stored × bu → "unutulmaya başlıyor". */
  forgetting_flag_ratio: 0.85,
  /** "biliyorum" dediği konuda deneme sonrası bu altı → uyarı. */
  overconfident_threshold: 60,
} as const

export type UpplanSqlKey = keyof typeof UPPLAN_SQL_CONFIG

// ── Profil ──────────────────────────────────────────────────────────────
export const FOCUS_OPTIONS = [25, 45, 60, 90] as const
export type FocusMinutes = (typeof FOCUS_OPTIONS)[number]
export const DEFAULT_FOCUS: FocusMinutes = 45

/**
 * Sınav tarihleri — TAHMİNİ (ÖSYM / MEB takvimi açıklanınca güncelle).
 * DD.MM.YYYY gösterimi için ISO tutulur.
 */
export const EXAM_DATES = {
  yks: { date: "2027-06-19", label: "YKS 2027", estimated: true },
  lgs: { date: "2027-06-13", label: "LGS 2027", estimated: true },
} as const

// ── Müsaitlik ızgarası ──────────────────────────────────────────────────
export const GRID_START_HOUR = 6
export const GRID_END_HOUR = 24
export const SLOT_MINUTES = 30
export const SLOTS_PER_DAY = ((GRID_END_HOUR - GRID_START_HOUR) * 60) / SLOT_MINUTES

// ── Alan → ders kapsamı (subjects.name) ─────────────────────────────────
// YKS'de tüm TYT dersleri + alana göre AYT dersleri. DB'de YDT dersi yok →
// dil alanı şimdilik yalnız TYT. LGS: exam_type = 'lgs' olan tüm dersler.
export const ALAN_AYT_SUBJECTS = {
  sayisal: ["AYT Matematik", "AYT Geometri", "AYT Fizik", "AYT Kimya", "AYT Biyoloji"],
  ea: ["AYT Matematik", "AYT Geometri", "AYT Edebiyat", "AYT Tarih", "AYT Coğrafya"],
  sozel: ["AYT Edebiyat", "AYT Tarih", "AYT Coğrafya", "AYT Felsefe", "AYT Sosyoloji", "AYT Din Kültürü"],
  dil: [],
} as const satisfies Record<string, readonly string[]>

// ── Konu taraması ───────────────────────────────────────────────────────
export const SCAN_AUTOSAVE_MS = 800

// ── Harita ──────────────────────────────────────────────────────────────
export const TREND_WEEKS = 8

// ── Bugün ekranı ────────────────────────────────────────────────────────
/** En fazla kaç tekrar önerisi. */
export const REVIEW_MAX = 2
/** Önerilmesi için stored − effective en az bu kadar (puan). */
export const REVIEW_MIN_DROP = 2
/** Önerilen tekrar soru sayısı. */
export const REVIEW_QUESTIONS = 15
/** Son denemede bir derste bu kadar ve üstü yanlış → uyarı. */
export const ALERT_EXAM_SUBJECT_WRONGS = 5
