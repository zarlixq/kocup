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
  /**
   * Başka konudaki sorunun yanlışı bu konunun bilgi atomuna bağlıysa (çapraz,
   * migration 215) bu konuya kaç soru ağırlığında yansır. Sorunun kendi
   * konusundaki kanıt değişmez; burası yalnız ek, hafif sinyal.
   */
  cross_atom_weight: 0.5,
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

/**
 * Track (sınıf bazlı segment) ve haftalık program kalitesi katsayıları —
 * migration 227 upplan_config seed'iyle birebir (config.test.ts). SQL tarafı
 * yalnız takvim anahtarlarını okur (upplan_track_for); gerisi uygulamada.
 * Track'e özgü değerler `<önek>_<track>_<ad>` biçiminde; okumak için
 * lib/upplan/track.ts → trackHours / trackLimits.
 */
export const UPPLAN_TRACK_SQL_CONFIG = {
  edu_year_rollover_month: 7,
  first_maarif_graduation_year: 2028,
  track_maarif_9_hours_min: 6,
  track_maarif_9_hours_max: 10,
  track_maarif_10_hours_min: 8,
  track_maarif_10_hours_max: 12,
  track_maarif_11_hours_min: 12,
  track_maarif_11_hours_max: 18,
  track_eski_12_hours_min: 20,
  track_eski_12_hours_max: 30,
  track_mezun_hours_min: 35,
  track_mezun_hours_max: 45,
  limit_maarif_9_daily_max_min: 180,
  limit_maarif_10_daily_max_min: 210,
  limit_maarif_11_daily_max_min: 300,
  limit_eski_12_daily_max_min: 360,
  limit_mezun_daily_max_min: 540,
  limit_maarif_9_school_day_max_min: 120,
  limit_maarif_10_school_day_max_min: 120,
  limit_maarif_11_school_day_max_min: 180,
  limit_eski_12_school_day_max_min: 240,
  limit_mezun_school_day_max_min: 540,
  limit_maarif_9_free_half_days: 2,
  limit_maarif_10_free_half_days: 2,
  limit_maarif_11_free_half_days: 2,
  limit_eski_12_free_half_days: 1,
  limit_mezun_free_half_days: 1,
  /** Yarıyıl / ara tatil haftasında yük çarpanı. */
  holiday_load_multiplier: 1.35,
  /** Yazılı haftasında okul konusu öncelik çarpanı. */
  exam_week_school_weight: 1.5,
  /** Okul takibi: bugünkü okul haftasından kaç hafta önden gidilir. */
  school_ahead_weeks: 2,
  /** Okul haftası yakınlığı: |fark| bu kadar haftada öncelik yarıya iner. */
  school_proximity_decay_weeks: 4,
  maarif_w_school: 1,
  maarif_w_gap: 1,
  maarif_w_yks: 1,
  /** 11. sınıfta AYT eşlemeleri bu okul haftasından (2. dönem) itibaren sayılır. */
  maarif_11_ayt_from_week: 19,
  /** 10. sınıfta TYT temel alışkanlık bloğu bu okul haftasından itibaren. */
  maarif_10_tyt_habit_from_week: 19,
  maarif_habit_minutes: 15,
  maarif_habit_days: 5,
  context_block_minutes: 30,
  context_blocks_per_week: 1,
  /** Alan dışı (düşük getirili) dersler haftalık sürenin en fazla bu oranı. */
  lowvalue_cap_ratio: 0.08,
  lowvalue_block_min: 25,
  lowvalue_block_max: 40,
  skeleton_problem_minutes: 20,
  skeleton_paragraf_minutes: 20,
  /** Alanın ana AYT dersi haftada en az bu kadar gün. */
  ayt_core_min_days: 4,
  /** Konu/video bloğundan sonra aynı konunun soru bloğu en geç (gün). */
  konu_soru_max_gap_days: 2,
  ratio_konu_max: 0.4,
  ratio_soru_min: 0.45,
  ratio_tekrar_min: 0.15,
  short_review_minutes: 30,
  /** Kısa tekrar en kısa (dk): 30 dk boşluk yoksa. */
  short_review_min_minutes: 25,
  soru_block_min_minutes: 30,
  video_min_chunk_minutes: 20,
  exam_analysis_minutes: 50,
  exam_analysis_bonus: 1.25,
  /** Öğrenci/koç hedefi önceliğe çarpan (override değil). */
  user_goal_bonus: 1.3,
  rank_pressure_boost: 0.5,
  rank_reference_max: 200000,
  rank_reference_min: 1000,
  subject_gap_floor: 0.15,
  feedback_penalty: 0.85,
  feedback_penalty_days: 14,
  /** Alt sınıftan eksik konunun okul yakınlığı yerine geçen çarpan (× ustalık açığı). */
  maarif_lower_grade_proximity: 0.5,
  /** 11: YKS değeri bu (0..1) ve üstündeyse gerekçede belirtilir. */
  yks_value_reason_min: 0.5,
  /** 10. sınıf alan eğilimi dersine öncelik çarpanı. */
  alan_egilimi_bonus: 1.1,
} as const

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

/**
 * Maarif 11. sınıf ders kapsamı (subjects.ders_key): ortak dersler + alanın
 * seçmeli dersleri. 9-10'da bütün dersler kapsamdadır.
 */
export const MAARIF_11_DERS = {
  ortak: ["edebiyat", "tarih", "din", "ingilizce", "felsefe"],
  sayisal: ["matematik", "fizik", "kimya", "biyoloji"],
  ea: ["matematik", "cografya"],
  sozel: ["cografya", "sosyoloji", "mantik", "psikoloji"],
  dil: [],
} as const satisfies Record<string, readonly string[]>

/**
 * Alan dışı (puan türüne az katkılı) dersler: haftalık sürenin en fazla
 * lowvalue_cap_ratio'su, kısa bloklarla (lowvalue_block_min..max). TYT
 * dersleri adıyla; Maarif dersleri ders_key ile (11. sınıf alan dışı).
 */
export const LOW_VALUE_SUBJECTS: Record<string, readonly string[]> = {
  sayisal: ["TYT Din Kültürü", "TYT Felsefe", "TYT Tarih", "TYT Coğrafya", "din", "felsefe", "tarih", "cografya", "sosyoloji", "mantik", "psikoloji"],
  ea: ["TYT Din Kültürü", "TYT Felsefe", "TYT Fizik", "TYT Kimya", "TYT Biyoloji", "din", "fizik", "kimya", "biyoloji"],
  sozel: ["TYT Fizik", "TYT Kimya", "TYT Biyoloji", "fizik", "kimya", "biyoloji"],
  dil: ["TYT Fizik", "TYT Kimya", "TYT Biyoloji", "TYT Din Kültürü", "TYT Felsefe", "fizik", "kimya", "biyoloji", "din", "felsefe"],
}

/**
 * Alanın ana AYT dersi: haftada en az ayt_core_min_days gün blok alır (sayısalda
 * AYT Matematik). Ağır sayısal dersler (HEAVY_SUBJECTS) günün ilk yarısına konur.
 */
export const ALAN_CORE_SUBJECT: Record<string, string | null> = {
  sayisal: "AYT Matematik",
  ea: "AYT Matematik",
  sozel: "AYT Edebiyat",
  dil: null,
}
export const HEAVY_SUBJECTS: readonly string[] = [
  "TYT Matematik", "TYT Geometri", "TYT Fizik", "TYT Kimya", "AYT Matematik", "AYT Geometri", "AYT Fizik", "AYT Kimya",
  "matematik", "fizik", "kimya",
]

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
/**
 * Konu çalışması (öğrenme aşaması) bloğunun en kısa süresi (dk). Odak süresi
 * kısaysa arka arkaya birden çok blok (45 dk → 2 blok). Hedefin süre
 * ihtiyacına da bu kadar konu anlatımı eklenir.
 */
export const KONU_CALISMA_MIN_DK = 90
export const LECTURE_MINUTES = KONU_CALISMA_MIN_DK
/** "Eksik" konularda opsiyonel kısa konu tekrarı (dk, tek blok). */
export const SHORT_REVIEW_MINUTES = 45
/** Deneme süresi (dk) — TYT ve LGS. */
export const PRACTICE_EXAM_MINUTES = { yks: 165, lgs: 155 } as const
/** Müsait saatin planlanabilir oranı (mola, esneklik payı). */
export const CAPACITY_UTILIZATION = 0.85
/** Aynı anda aktif konu sınırları; bir aktif konuya haftada en az bu kadar dk düşmeli. */
export const ACTIVE_TOPICS_RANGE = { min: 4, max: 6 } as const
/** Aynı anda öğrenme aşamasında (konu anlatımı bitmemiş) en fazla konu. */
export const MAX_LEARNING_ACTIVE = 4
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
/** Konu taramasında sınıf bazlı toplu "görmedim" butonları (topics.grade). */
export const SCAN_BULK_GRADES = [11, 12] as const

// ═════════════════════════════════════════════════════════════════════════
// Faz C — TYT → AYT kapısı, alan ağırlığı, öğrenme aşaması
// ═════════════════════════════════════════════════════════════════════════

/**
 * Ders bazlı kapı: AYT dersinin konuları, ilgili TYT dersinin temel konuları
 * tamamlanmadan (tamamlandı ya da etkili ustalık ≥ GATE_MASTERY) açılmaz.
 * Temel konu = AYT dersinin konularının ön koşul zincirindeki bu TYT
 * derslerine ait konular. Zincir yoksa ya da eksikse (AYT dersinin atom
 * verisi olmayan konusu varsa) kapı TYT dersinin TÜM konularıdır.
 */
export const AYT_PREREQ_SUBJECTS: Record<string, readonly string[]> = {
  "AYT Matematik": ["TYT Matematik"],
  "AYT Geometri": ["TYT Geometri"],
  "AYT Fizik": ["TYT Fizik"],
  "AYT Kimya": ["TYT Kimya"],
  "AYT Biyoloji": ["TYT Biyoloji"],
  "AYT Edebiyat": ["TYT Türkçe"],
  "AYT Tarih": ["TYT Tarih"],
  "AYT Coğrafya": ["TYT Coğrafya"],
  "AYT Felsefe": ["TYT Felsefe"],
  "AYT Sosyoloji": ["TYT Felsefe"],
  "AYT Din Kültürü": ["TYT Din Kültürü"],
}

/** Kapı konusu bu etkili ustalıkla geçilmiş sayılır. */
export const GATE_MASTERY = UPPLAN_SQL_CONFIG.label_iyi
/** Sınava bu kadar hafta kala AYT konuları kapı açılmasa da TYT ile paralel başlar. */
export const AYT_FORCE_START_WEEKS = 26

// ── Saat başına puan (verimlilik) ───────────────────────────────────────
/**
 * ÖSYM puan katsayıları: testte 1 netin ham puana katkısı (puan türü bazında).
 *
 * KAYNAK: 2025-YKS sonuçlarından türetilmiş net başına puanlar — derleme:
 *   https://liderrehberin.com/puan-hesaplama ("Yıllara Göre YKS Puan Katsayıları", 2025 sütunu).
 *   SAY 2024 değerleri ÖSYM "2024-YKS Sayısal Bilgiler" raporundaki değerlerle
 *   (https://www.hemenhesap.com/hesap/yks-puan-hesaplama) birebir tutuyor; 2025 aynı kaynaktan.
 *   ÖSYM sabit katsayı yayımlamaz: puanlar her yıl testlerin ortalama/standart
 *   sapmasından hesaplanır, bu değerler sınav sonrası geriye dönük türetilmiştir.
 *   Yeni yıl açıklanınca güncelle.
 * TAHMİNİ: "AYT Din Kültürü" SÖZ katsayısı (kaynakta "DKAB / İlave Felsefe G."
 *   satırı, 2.36) ve LGS katsayıları (MEB ağırlıkları: Türkçe/Mat/Fen ×4,
 *   diğerleri ×1; yalnız oran önemli).
 */
export type PuanTuru = "SAY" | "EA" | "SOZ" | "DIL" | "LGS"
export const SCORE_COEFFICIENTS: Record<PuanTuru, Record<string, number>> = {
  SAY: {
    "TYT Türkçe": 1.2, "TYT Sosyal": 1.27, "TYT Matematik": 1.39, "TYT Fen": 1.07,
    "AYT Matematik": 2.89, "AYT Fizik": 2.46, "AYT Kimya": 2.53, "AYT Biyoloji": 2.61,
  },
  EA: {
    "TYT Türkçe": 1.19, "TYT Sosyal": 1.26, "TYT Matematik": 1.38, "TYT Fen": 1.07,
    "AYT Matematik": 2.88, "AYT Edebiyat": 2.94, "AYT Tarih-1": 2.53, "AYT Coğrafya-1": 2.85,
  },
  SOZ: {
    "TYT Türkçe": 1.13, "TYT Sosyal": 1.19, "TYT Matematik": 1.31, "TYT Fen": 1.01,
    "AYT Edebiyat": 2.79, "AYT Tarih-1": 2.39, "AYT Coğrafya-1": 2.7, "AYT Tarih-2": 3.8,
    "AYT Coğrafya-2": 2.47, "AYT Felsefe Grubu": 3.76, "AYT Din Kültürü": 2.36, // Din: tahmini
  },
  DIL: { "TYT Türkçe": 1.53, "TYT Sosyal": 1.62, "TYT Matematik": 1.77, "TYT Fen": 1.37, "YDT": 2.6 },
  // Tahmini (MEB ağırlık katsayıları; mutlak değer değil oran önemli).
  LGS: { "LGS Türkçe": 4, "LGS Matematik": 4, "LGS Fen Bilimleri": 4, "LGS T.C. İnkılap Tarihi": 1, "LGS Din Kültürü": 1, "LGS İngilizce": 1 },
}

/** Ders (subjects.name) → ÖSYM testi ve testteki soru sayısı (ders iki teste bölünüyorsa iki satır). */
export const SUBJECT_TESTS: Record<string, readonly { test: string; questions: number }[]> = {
  "TYT Türkçe": [{ test: "TYT Türkçe", questions: 40 }],
  "TYT Matematik": [{ test: "TYT Matematik", questions: 30 }],
  "TYT Geometri": [{ test: "TYT Matematik", questions: 10 }],
  "TYT Fizik": [{ test: "TYT Fen", questions: 7 }],
  "TYT Kimya": [{ test: "TYT Fen", questions: 7 }],
  "TYT Biyoloji": [{ test: "TYT Fen", questions: 6 }],
  "TYT Tarih": [{ test: "TYT Sosyal", questions: 5 }],
  "TYT Coğrafya": [{ test: "TYT Sosyal", questions: 5 }],
  "TYT Felsefe": [{ test: "TYT Sosyal", questions: 5 }],
  "TYT Din Kültürü": [{ test: "TYT Sosyal", questions: 5 }],
  "AYT Matematik": [{ test: "AYT Matematik", questions: 30 }],
  "AYT Geometri": [{ test: "AYT Matematik", questions: 10 }],
  "AYT Fizik": [{ test: "AYT Fizik", questions: 14 }],
  "AYT Kimya": [{ test: "AYT Kimya", questions: 13 }],
  "AYT Biyoloji": [{ test: "AYT Biyoloji", questions: 13 }],
  "AYT Edebiyat": [{ test: "AYT Edebiyat", questions: 24 }],
  "AYT Tarih": [{ test: "AYT Tarih-1", questions: 10 }, { test: "AYT Tarih-2", questions: 11 }],
  "AYT Coğrafya": [{ test: "AYT Coğrafya-1", questions: 6 }, { test: "AYT Coğrafya-2", questions: 11 }],
  "AYT Felsefe": [{ test: "AYT Felsefe Grubu", questions: 9 }],
  "AYT Sosyoloji": [{ test: "AYT Felsefe Grubu", questions: 3 }],
  "AYT Din Kültürü": [{ test: "AYT Din Kültürü", questions: 6 }],
  "LGS Türkçe": [{ test: "LGS Türkçe", questions: 20 }],
  "LGS Matematik": [{ test: "LGS Matematik", questions: 20 }],
  "LGS Fen Bilimleri": [{ test: "LGS Fen Bilimleri", questions: 20 }],
  "LGS T.C. İnkılap Tarihi": [{ test: "LGS T.C. İnkılap Tarihi", questions: 10 }],
  "LGS Din Kültürü": [{ test: "LGS Din Kültürü", questions: 10 }],
  "LGS İngilizce": [{ test: "LGS İngilizce", questions: 10 }],
}

/** Alan → puan türü (LGS segmenti alan taşımaz). */
export const ALAN_PUAN_TURU: Record<string, PuanTuru> = { sayisal: "SAY", ea: "EA", sozel: "SOZ", dil: "DIL" }

/**
 * Ders taban payı (kapsama kuralı, elle öncelik değil): planlanabilir saatin bu
 * oranı, puan türüne giren derslere puan ağırlıklarıyla (soru × katsayı) taban
 * olarak ayrılır; ders kendi içinde verimlilik sırasıyla doldurur. Kalan saat
 * bütün konular arasında verimliliğe göre. Saf verimlilik azalan getiriyi
 * görmez ve dersleri sıfıra düşürebilir; taban bunu önler.
 */
export const DERS_TABAN_ORANI = 0.5

/**
 * topic_exam_weights'te avg_questions = 0 ve sifir_nedeni = "sorulmadi" olan
 * konuya verilen taban ağırlık: dersin konu başı ortalamasının bu oranı
 * (son yıllarda sorulmamış olması hiç sorulmayacağı anlamına gelmez).
 */
export const SIFIR_AGIRLIK_TABANI = 0.15

/** Kazanılabilir pay = (TARGET_MASTERY − etkili ustalık) / 100, alt sınır 0. */
export const TARGET_MASTERY = 90

/**
 * Konuyu hedefe getirmek için gereken saat (varsayılan soru hızında,
 * DEFAULT_MINUTES_PER_QUESTION). Öğrencinin gerçek soru hızıyla ölçeklenir.
 * Tarama yoksa etkili ustalıktan: < 40 → hic_gormedim, < 75 → eksik, yoksa biliyorum.
 */
export const HOURS_BY_STATE = { hic_gormedim: 5, eksik: 3, biliyorum: 1 } as const

/**
 * Konu büyüklük çarpanı (gereken saat ve hedef soru bununla ölçeklenir):
 *   çarpan = dersin tipik konu büyüklüğü × konunun ders ortalamasına göre büyüklüğü
 *   konunun göreli büyüklüğü, en iyi veriden: atom sayısı / dersin ortalama atom
 *   sayısı → (yoksa) topic_exam_weights soru sayısı / dersin ortalaması → (yoksa) 1.
 * Sözel/ezber derslerin konuları kısa, matematik/fizik konuları uzun.
 */
export const SUBJECT_TOPIC_SIZE: Record<string, number> = {
  "TYT Türkçe": 0.8,
  "TYT Matematik": 1,
  "TYT Geometri": 1,
  "TYT Fizik": 1.1,
  "TYT Kimya": 1,
  "TYT Biyoloji": 0.8,
  "TYT Tarih": 0.5,
  "TYT Coğrafya": 0.5,
  "TYT Felsefe": 0.5,
  "TYT Din Kültürü": 0.4,
  "AYT Matematik": 1.5,
  "AYT Geometri": 1.2,
  "AYT Fizik": 1.5,
  "AYT Kimya": 1.3,
  "AYT Biyoloji": 1,
  "AYT Edebiyat": 0.8,
  "AYT Tarih": 0.7,
  "AYT Coğrafya": 0.7,
  "AYT Felsefe": 0.6,
  "AYT Sosyoloji": 0.5,
  "AYT Din Kültürü": 0.5,
}
export const DEFAULT_TOPIC_SIZE = 1
export const TOPIC_SIZE_RANGE = { min: 0.3, max: 2.5 } as const

// ── Sürekli pratik ──────────────────────────────────────────────────────
/**
 * Bu konular öğrenme aşamasından sonra "tamamlandı" olup çıkmaz; sınava kadar
 * her hafta küçük pratik bloğu alır (aktif konu sınırına sayılmaz). Grubun
 * haftalık blokları grubun (öğrenilmiş) konuları arasında haftadan haftaya döner.
 */
export const PRACTICE_GROUPS: readonly {
  key: string
  label: string
  subject: string
  topics: readonly string[]
  blocksPerWeek: number
  questionsPerBlock: number
}[] = [
  { key: "paragraf", label: "Paragraf", subject: "TYT Türkçe", topics: ["Paragraf", "Cümlede Anlam"], blocksPerWeek: 3, questionsPerBlock: 20 },
  {
    key: "problemler",
    label: "Problemler",
    subject: "TYT Matematik",
    topics: [
      "Sayı ve Kesir Problemleri",
      "Yaş ve Yüzde Problemleri",
      "Kar - Zarar ve Faiz Problemleri",
      "Karışım Problemleri",
      "İşçi - Havuz Problemleri",
      "Hareket Problemleri",
      "Grafik ve Tablo Problemleri",
      "Rutin Olmayan Problemler",
    ],
    blocksPerWeek: 2,
    questionsPerBlock: 20,
  },
  { key: "siir_yorum", label: "Şiir yorumu", subject: "AYT Edebiyat", topics: ["Şiir Bilgisi (Biçim ve İçerik)"], blocksPerWeek: 1, questionsPerBlock: 15 },
]

/** Video ↔ konu otomatik eşleşmesinin öneri sayılması için en düşük benzerlik (0..1). */
export const VIDEO_MATCH_MIN_SCORE = 0.5
/** Hoca etkinliği kartı: en az bu kadar sonradan çözülmüş soru yoksa "yetersiz veri". */
export const TEACHER_STATS_MIN_QUESTIONS = 40

/**
 * Playlist konu sırası: kapsamdaki konunun hedef bitişi = son videosunun plan
 * tarihi + bu kadar gün (soru çözümü tamponu).
 */
export const PLAYLIST_TOPIC_BUFFER_DAYS = 3

/**
 * Playlist'in dersi dışındaki bir ders, playlist bu dersten en az bu kadar
 * konuyu kapsıyorsa "kapsamdaki ders" sayılır (tek yanlış eşleşme bütün dersi
 * bekletmesin). Kapsamdaki derste eşlenmemiş konular playlist bitince başlar.
 */
export const PLAYLIST_SUBJECT_MIN_TOPICS = 2

/**
 * Video konu eşleştirmesinde playlist'in dersine ek olarak aranan dersler (ad
 * bazında): TYT Matematik playlist'indeki geometri videoları Geometri konularına
 * eşlenebilsin. Eşit puanda playlist'in kendi dersi tercih edilir.
 */
export const RELATED_VIDEO_SUBJECTS: Record<string, readonly string[]> = {
  "TYT Matematik": ["TYT Geometri"],
  "TYT Geometri": ["TYT Matematik"],
  "AYT Matematik": ["AYT Geometri"],
  "AYT Geometri": ["AYT Matematik"],
}

/**
 * Video konu eşleştirmesi (lib/resources/video-topic-match.ts):
 * yüksek güven eşiği ve en iyi iki aday arasındaki asgari fark. Altında kalan
 * eşleşme videoyu konuya bağlamaz, "onay bekliyor" önerisi olur.
 */
export const VIDEO_MATCH_HIGH_SCORE = 0.8
export const VIDEO_MATCH_MARGIN = 0.15

/**
 * Konu adı başlıkta geçmediğinde müfredat eş anlamlıları (konu adı → ifade).
 * İfade, temizlenmiş başlıkta kelime başından itibaren aranır (Türkçe
 * karakterler sadeleştirilir; "yas problem" → "Yaş Problemleri 1").
 */
export const VIDEO_TOPIC_ALIASES: Record<string, readonly string[]> = {
  "Temel Kavramlar": ["temel islem", "pozitif negatif", "faktoriyel", "sayi kumeleri"],
  "Asal Sayılar": ["asal carpan"],
  "Denklem Çözme": ["1. dereceden denklem", "birinci dereceden denklem"],
  "Sayı ve Kesir Problemleri": ["denklem kurma", "sayi problem", "kesir problem"],
  "Yaş ve Yüzde Problemleri": ["yas problem", "yuzde problem"],
  "Kar - Zarar ve Faiz Problemleri": ["kar zarar", "faiz problem"],
  "İşçi - Havuz Problemleri": ["isci", "havuz problem"],
  "Rutin Olmayan Problemler": ["periyodik", "rutin olmayan"],
  "Kümeler": ["kartezyen"],
  "Permütasyon - Kombinasyon": ["permutasyon", "kombinasyon", "binom"],
}
