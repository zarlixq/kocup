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

// ═════════════════════════════════════════════════════════════════════════
// Faz B — yol haritası + haftalık program (yalnız TS; SQL bu değerleri kullanmaz)
// ═════════════════════════════════════════════════════════════════════════

/**
 * Dersin sınavdaki soru sayısı (subjects.name). topic_exam_weights verisi
 * gelene kadar konu ağırlığı = ders soru sayısı / dersin aktif konu sayısı.
 * TYT Matematik 40 sorunun ~10'u geometri; AYT Felsefe grubu 12 sorunun ~3'ü sosyoloji.
 */
export const SUBJECT_EXAM_QUESTIONS: Record<string, number> = {
  "TYT Türkçe": 40,
  "TYT Matematik": 30,
  "TYT Geometri": 10,
  "TYT Fizik": 7,
  "TYT Kimya": 7,
  "TYT Biyoloji": 6,
  "TYT Tarih": 5,
  "TYT Coğrafya": 5,
  "TYT Felsefe": 5,
  "TYT Din Kültürü": 5,
  "AYT Matematik": 30,
  "AYT Geometri": 10,
  "AYT Fizik": 14,
  "AYT Kimya": 13,
  "AYT Biyoloji": 13,
  "AYT Edebiyat": 24,
  "AYT Tarih": 21,
  "AYT Coğrafya": 17,
  "AYT Felsefe": 9,
  "AYT Sosyoloji": 3,
  "AYT Din Kültürü": 6,
  "LGS Türkçe": 20,
  "LGS Matematik": 20,
  "LGS Fen Bilimleri": 20,
  "LGS T.C. İnkılap Tarihi": 10,
  "LGS Din Kültürü": 10,
  "LGS İngilizce": 10,
}

/** Ders soru sayısı config'te yoksa. */
export const DEFAULT_SUBJECT_EXAM_QUESTIONS = 5

// ── Öncelik puanı ───────────────────────────────────────────────────────
/** Son kaç deneme ders net açığına bakılır. */
export const NET_GAP_EXAMS = 3
/** Net açığı çarpanı = 1 + kayıp oranı × bu (kayıp oranı 0..1). Deneme yoksa 1. */
export const NET_GAP_STRENGTH = 1
/** Konuda yüksek güvenli açık (açık haritası) varsa puan çarpanı. */
export const GAP_MULTIPLIER = 1.25
/** Açık haritasında "yüksek güvenli" sayılan güven seviyeleri. */
export const GAP_CONFIDENT_LEVELS = ["orta", "yuksek"] as const
/** Ustalık satırı olmayan konunun etkili skoru (öncül, tarama yok). */
export const NO_DATA_MASTERY = UPPLAN_SQL_CONFIG.prior_none

// ── Hedef şablonları (etkili skora göre) ────────────────────────────────
export const BLOCK_TYPES = ["konu_calisma", "soru_cozum", "tekrar"] as const
export type BlockType = (typeof BLOCK_TYPES)[number]

export const GOAL_TEMPLATES: Record<BlockType, { questions: number; accuracy: number }> = {
  konu_calisma: { questions: 120, accuracy: 70 },
  soru_cozum: { questions: 80, accuracy: 75 },
  tekrar: { questions: 30, accuracy: 85 },
}

/** Tamamlanma: hedef soru doldu VE etkili skor ≥ bu. */
export const COMPLETION_MASTERY = UPPLAN_SQL_CONFIG.label_iyi

// ── Süre ve kapasite ────────────────────────────────────────────────────
/** Öğrencinin soru başı süresi bilinmiyorsa (dk). */
export const DEFAULT_MINUTES_PER_QUESTION = 1.5
/** Gerçek soru başı süre için gereken en az süreli soru sayısı. */
export const MIN_TIMED_QUESTIONS = 40
/** Soru başı süre sınırları (uç kayıtlara karşı, dk). */
export const MINUTES_PER_QUESTION_RANGE = { min: 0.75, max: 4 } as const
/** konu_calisma hedefinde konu anlatımı için ek süre (dk). */
export const LECTURE_MINUTES = 90
/** Deneme süresi (dk) — TYT ve LGS. */
export const PRACTICE_EXAM_MINUTES = { yks: 165, lgs: 155 } as const
/** Müsait saatin planlanabilir oranı (mola, esneklik payı). */
export const CAPACITY_UTILIZATION = 0.85
/** Aynı anda aktif konu sınırları; bir aktif konuya haftada en az bu kadar dk düşmeli. */
export const ACTIVE_TOPICS_RANGE = { min: 4, max: 8 } as const
export const MIN_WEEKLY_MINUTES_PER_ACTIVE = 120
/** Sınav öncesi deneme dönemi (hafta): yeni konu açılmaz. */
export const EXAM_PERIOD_WEEKS = 6

/** Haftalık deneme sayısı: sınava kalan haftaya göre (büyükten küçüğe ilk eşleşen). */
export const PRACTICE_EXAMS_PER_WEEK: { minWeeksLeft: number; perWeek: number }[] = [
  { minWeeksLeft: 13, perWeek: 1 },
  { minWeeksLeft: EXAM_PERIOD_WEEKS, perWeek: 2 },
  { minWeeksLeft: 0, perWeek: 3 },
]

// ── Haftalık program ────────────────────────────────────────────────────
/** Bloklar arası mola (dk). */
export const BREAK_MINUTES = 10
/** Günde aynı dersten en fazla blok. */
export const MAX_SUBJECT_BLOCKS_PER_DAY = 2
/** Deneme tercih günleri sırası (1=Pzt..7=Paz): hafta sonu sabahı önce. */
export const PRACTICE_EXAM_DAYS = [6, 7, 3] as const
/** Aralıklı tekrar: tamamlanan konuya kaç gün sonra tekrar bloğu. */
export const SPACED_REVIEW_DAYS = [3, 7, 21] as const
/** Tekrar bloğu soru aralığı. */
export const REVIEW_BLOCK_QUESTIONS = { min: 15, max: 20 } as const
/** effective, stored'un bu oranının altına düştüyse (unutma) tekrar bloğu. */
export const FORGETTING_REVIEW_RATIO = UPPLAN_SQL_CONFIG.forgetting_flag_ratio
/** Haftada en fazla kaç tekrar bloğu. */
export const MAX_REVIEW_BLOCKS_PER_WEEK = 4

// ── Haftalık güncelleme ─────────────────────────────────────────────────
/** Uyum bu oranın altındaysa haftalık yük azaltılır (0..1). */
export const LOW_COMPLIANCE = 0.5
/** Her düşük uyumlu haftada yük çarpanı bu kadar azalır; alt sınır. */
export const LOAD_FACTOR_STEP = 0.15
export const LOAD_FACTOR_MIN = 0.55
/** Uyum iyiyse yük çarpanı geri bu kadar artar (en fazla 1). */
export const LOAD_FACTOR_RECOVERY = 0.1
/** Bir konunun bitişi bu kadar gün ve üstü kayarsa bildirim. */
export const BIG_SHIFT_DAYS = 14
/** "Geride" sayılmadan önce ilerlemenin geçen süre oranının ne kadar altında kalabileceği. */
export const PACE_TOLERANCE = 0.1
/** Konu çalışması bloğunda sürenin soru çözümüne ayrılan payı (kalanı konu anlatımı). */
export const KONU_CALISMA_QUESTION_SHARE = 0.5
/** Bugün ekranında en fazla kaç okunmamış UpPlan bildirimi. */
export const TODAY_NOTICE_LIMIT = 3
/** Bir dalgada (aynı anda aktif) aynı dersten en fazla konu — çeşitlilik ve günlük ders sınırıyla uyum. */
export const MAX_ACTIVE_PER_SUBJECT = 2
