import { UPPLAN_TRACK_SQL_CONFIG as C } from "@/lib/upplan/config"

// UpPlan track'i (sınıf bazlı segment) — TEK KAYNAK. SQL aynası migration 227
// (upplan_edu_end_year / upplan_grade_for / upplan_track_for); track.test.ts ikisinin
// aynı kuralı izlediğini örneklerle sabitler. Track grade'den değil
// graduation_year + bugünün eğitim yılından türer: sınıf atlama otomatik,
// 12 bitince 'mezun'.

export const TRACKS = ["maarif_9", "maarif_10", "maarif_11", "maarif_12", "eski_12", "mezun", "lgs"] as const
export type Track = (typeof TRACKS)[number]
/** Ayrı katsayısı olan track'ler (maarif_12 = eski_12 değerleri; lgs eski LGS akışı). */
export type TunedTrack = "maarif_9" | "maarif_10" | "maarif_11" | "eski_12" | "mezun"

export const TRACK_LABEL: Record<Track, string> = {
  maarif_9: "9. sınıf (Maarif)",
  maarif_10: "10. sınıf (Maarif)",
  maarif_11: "11. sınıf (Maarif)",
  maarif_12: "12. sınıf (Maarif)",
  eski_12: "12. sınıf",
  mezun: "Mezun",
  lgs: "Ortaokul (LGS)",
}

export function isTrack(v: unknown): v is Track {
  return typeof v === "string" && (TRACKS as readonly string[]).includes(v)
}

/** Okul takibi yapan track'ler: konu havuzu Maarif dersleri, sınav dili yok (9-10). */
export const MAARIF_TRACKS: readonly Track[] = ["maarif_9", "maarif_10", "maarif_11"]
export const isMaarifTrack = (t: Track | null): t is "maarif_9" | "maarif_10" | "maarif_11" =>
  t !== null && MAARIF_TRACKS.includes(t)
/** TYT/AYT havuzlu track'ler (mevcut YKS algoritması). */
export const isYksPoolTrack = (t: Track | null) => t === "eski_12" || t === "maarif_12" || t === "mezun"
/** Alan seçimi zorunlu mu (9-10'da alan yok). */
export const alanRequired = (t: Track | null) => t !== null && t !== "maarif_9" && t !== "maarif_10" && t !== "lgs"

function ymd(iso: string): [number, number] {
  const [y, m] = iso.split("-").map(Number)
  return [y, m]
}

/** Eğitim yılının bittiği takvim yılı (2026-10-24 → 2027; 2027-07-01 → 2028). */
export function eduEndYear(today: string): number {
  const [y, m] = ymd(today)
  return y + (m >= C.edu_year_rollover_month ? 1 : 0)
}

/** "2026-2027" (school_calendar_weeks.edu_year). */
export function eduYearLabel(today: string): string {
  const end = eduEndYear(today)
  return `${end - 1}-${end}`
}

/** Sınıf (mezunda > 12). */
export function gradeFor(graduationYear: number | null, today: string): number | null {
  return graduationYear === null ? null : 12 - (graduationYear - eduEndYear(today))
}

export function trackFor(graduationYear: number | null, today: string): Track | null {
  const g = gradeFor(graduationYear, today)
  if (g === null || graduationYear === null) return null
  if (g > 12) return "mezun"
  if (g === 12) return graduationYear >= C.first_maarif_graduation_year ? "maarif_12" : "eski_12"
  if (g >= 9) return `maarif_${g}` as Track
  if (g >= 5) return "lgs"
  return null
}

/** students.grade ("5".."12" | "Mezun") → mezuniyet yılı. */
export function graduationYearFor(grade: string | null, today: string): number | null {
  if (!grade) return null
  if (grade === "Mezun") return eduEndYear(today) - 1
  const n = Number(grade)
  return Number.isInteger(n) && n >= 5 && n <= 12 ? eduEndYear(today) + 12 - n : null
}

/** Sınıf (9..12) → mezuniyet yılı (profil formu). */
export function graduationYearForGrade(grade: number, today: string): number {
  return eduEndYear(today) + 12 - grade
}

/**
 * Hedef sınav yılı: lisede mezuniyet yılı (sınav yılı = mezuniyet yılı);
 * mezunda profildeki tercih, yoksa bu eğitim yılının YKS'si; LGS 8. sınıf sonu.
 */
export function examYearFor(
  p: { track: Track | null; graduation_year: number | null; target_exam_year: number | null },
  today: string,
): number | null {
  if (!p.track || p.graduation_year === null) return null
  if (p.track === "mezun") return Math.max(p.target_exam_year ?? eduEndYear(today), eduEndYear(today))
  if (p.track === "lgs") return p.graduation_year - 4
  return p.graduation_year
}

/** Yeni soru tipi (bağlam temelli) uyarısı: Maarif'li ilk YKS ve sonrası. */
export function isContextBasedExamYear(examYear: number | null): boolean {
  return examYear !== null && examYear >= C.first_maarif_graduation_year
}

export function tunedTrack(t: Track): TunedTrack | null {
  if (t === "maarif_12") return "eski_12"
  if (t === "lgs") return null
  return t
}

/** Varsayılan haftalık ek çalışma aralığı (saat). */
export function trackHours(t: Track): { min: number; max: number } | null {
  const k = tunedTrack(t)
  if (!k) return null
  return { min: C[`track_${k}_hours_min`], max: C[`track_${k}_hours_max`] }
}

export type TrackLimits = {
  /** Günlük en fazla çalışma (dk). */
  dailyMax: number
  /** Okul günü (Pzt-Cuma, ders haftası) en fazla ek çalışma (dk). */
  schoolDayMax: number
  /** Haftada en az boş yarım gün (2 = bir tam gün). */
  freeHalfDays: number
}

export function trackLimits(t: Track): TrackLimits | null {
  const k = tunedTrack(t)
  if (!k) return null
  return {
    dailyMax: C[`limit_${k}_daily_max_min`],
    schoolDayMax: C[`limit_${k}_school_day_max_min`],
    freeHalfDays: C[`limit_${k}_free_half_days`],
  }
}
