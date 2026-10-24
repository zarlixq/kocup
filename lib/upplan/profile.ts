import { z } from "zod"
import { ALAN_AYT_SUBJECTS, FOCUS_OPTIONS, MAARIF_11_DERS, SLOTS_PER_DAY, type FocusMinutes } from "@/lib/upplan/config"
import { isTrack, type Track } from "@/lib/upplan/track"

// UpPlan profili — tipler, etiketler, doğrulama, ders kapsamı (saf; client'ta da kullanılır).

export const STATUSES = ["lise", "mezun", "acik_lise"] as const
export type UpplanStatus = (typeof STATUSES)[number]
export const STATUS_LABEL: Record<UpplanStatus, string> = {
  lise: "Lise",
  mezun: "Mezun",
  acik_lise: "Açık lise",
}

export const SEGMENTS = ["yks", "lgs"] as const
export type Segment = (typeof SEGMENTS)[number]
export const SEGMENT_LABEL: Record<Segment, string> = { yks: "YKS", lgs: "LGS" }

export const ALANLAR = ["sayisal", "ea", "sozel", "dil"] as const
export type Alan = (typeof ALANLAR)[number]
export const ALAN_LABEL: Record<Alan, string> = {
  sayisal: "Sayısal",
  ea: "Eşit Ağırlık",
  sozel: "Sözel",
  dil: "Dil",
}

export const SETUP_STEPS = ["profil", "tarama", "deneme", "bitti"] as const
export type SetupStep = (typeof SETUP_STEPS)[number]

/** Gün (1=Pzt..7=Paz) → 30 dk slot indeksleri. */
export type Availability = Record<string, number[]>

export type UpplanProfile = {
  status: UpplanStatus
  grade: number | null
  segment: Segment
  alan: Alan | null
  availability: Availability
  focus_minutes: FocusMinutes
  target_department: string | null
  target_ranking: number | null
  setup_step: SetupStep
  completed_at: string | null
  /** Haftalık yük çarpanı (uyum düşükse haftalık güncelleme azaltır), 0..1. */
  load_factor: number
  /** Mezuniyet yılı (track'in kaynağı; lib/upplan/track.ts). */
  graduation_year: number | null
  /** DB önbelleği (trigger + haftalık yenileme); hesap için trackFor(graduation_year, bugün). */
  track: Track | null
  /** Mezunun hedeflediği YKS yılı (null → bu eğitim yılının YKS'si). */
  target_exam_year: number | null
  /** 10. sınıf 2. dönem opsiyonel alan eğilimi: programı değiştirmez, ders ağırlığını hafif kaydırır. */
  alan_egilimi: Alan | null
  /** Feda listesinden "geri al" ile plana zorla alınan konular. */
  kept_topic_ids: string[]
}

function oneOf<T extends string>(list: readonly T[], v: unknown): v is T {
  return typeof v === "string" && (list as readonly string[]).includes(v)
}

export function parseAvailability(raw: unknown): Availability {
  const out: Availability = {}
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out
  for (const [day, slots] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^[1-7]$/.test(day) || !Array.isArray(slots)) continue
    const clean = slots.filter((s): s is number => Number.isInteger(s) && s >= 0 && s < SLOTS_PER_DAY)
    if (clean.length) out[day] = Array.from(new Set(clean)).sort((a, b) => a - b)
  }
  return out
}

/** DB satırı → tip (bilinmeyen değerler güvenli varsayılana düşer). */
export function toUpplanProfile(row: {
  status: string
  grade: number | null
  segment: string
  alan: string | null
  availability: unknown
  focus_minutes: number
  target_department: string | null
  target_ranking: number | null
  setup_step: string
  completed_at: string | null
  load_factor?: number | null
  graduation_year?: number | null
  track?: string | null
  target_exam_year?: number | null
  alan_egilimi?: string | null
  kept_topic_ids?: string[] | null
}): UpplanProfile {
  return {
    status: oneOf(STATUSES, row.status) ? row.status : "lise",
    grade: row.grade,
    segment: oneOf(SEGMENTS, row.segment) ? row.segment : "yks",
    alan: oneOf(ALANLAR, row.alan) ? row.alan : null,
    availability: parseAvailability(row.availability),
    focus_minutes: (FOCUS_OPTIONS as readonly number[]).includes(row.focus_minutes)
      ? (row.focus_minutes as FocusMinutes)
      : 45,
    target_department: row.target_department,
    target_ranking: row.target_ranking,
    setup_step: oneOf(SETUP_STEPS, row.setup_step) ? row.setup_step : "profil",
    completed_at: row.completed_at,
    load_factor: typeof row.load_factor === "number" && row.load_factor > 0 && row.load_factor <= 1 ? row.load_factor : 1,
    graduation_year: row.graduation_year ?? null,
    track: isTrack(row.track) ? row.track : null,
    target_exam_year: row.target_exam_year ?? null,
    alan_egilimi: oneOf(ALANLAR, row.alan_egilimi) ? row.alan_egilimi : null,
    kept_topic_ids: row.kept_topic_ids ?? [],
  }
}

export const profileSchema = z
  .object({
    status: z.enum(STATUSES),
    grade: z.number().int().min(5).max(12).nullable(),
    segment: z.enum(SEGMENTS),
    alan: z.enum(ALANLAR).nullable(),
    availability: z.record(z.string().regex(/^[1-7]$/), z.array(z.number().int().min(0).max(SLOTS_PER_DAY - 1)).max(SLOTS_PER_DAY)),
    focus_minutes: z.union(FOCUS_OPTIONS.map((n) => z.literal(n)) as [z.ZodLiteral<25>, z.ZodLiteral<45>, z.ZodLiteral<60>, z.ZodLiteral<90>]),
    target_department: z
      .string()
      .trim()
      .max(200, "Hedef bölüm en fazla 200 karakter olabilir.")
      .nullable()
      .transform((v) => (v ? v : null)),
    target_ranking: z.number().int().positive("Sıralama pozitif olmalı.").nullable(),
    target_exam_year: z.number().int().min(2026).max(2040).nullable().optional(),
    alan_egilimi: z.enum(ALANLAR).nullable().optional(),
  })
  // 9-10'da alan yok (alan eğilimi opsiyonel); 11, 12 ve mezunda alan zorunlu.
  .refine((p) => p.segment === "lgs" || (p.status === "lise" && p.grade !== null && p.grade <= 10) || p.alan !== null, {
    message: "Alanını seç.",
    path: ["alan"],
  })
  .refine((p) => p.status !== "lise" || p.grade !== null, { message: "Sınıfını seç.", path: ["grade"] })

export type ProfileInput = z.input<typeof profileSchema>

/** students.grade ("7".."12" | "Mezun") → profil ön değerleri. */
export function defaultsFromGrade(grade: string | null): Pick<UpplanProfile, "status" | "grade" | "segment"> {
  if (grade === "Mezun") return { status: "mezun", grade: null, segment: "yks" }
  const n = grade ? Number(grade) : NaN
  if (Number.isInteger(n)) return { status: "lise", grade: n, segment: n <= 8 ? "lgs" : "yks" }
  return { status: "lise", grade: null, segment: "yks" }
}

export type ScopeSubject = {
  id: string
  name: string
  exam_type: string | null
  curriculum: string | null
  order: number | null
  grade?: number | null
  ders_key?: string | null
}

/**
 * Maarif track'inin ders havuzu: 9 → 9. sınıf; 10 → 9 (eksik kapatma) + 10;
 * 11 → 9 + 10 (tekrar) + 11 (alana göre seçmeli dersler, MAARIF_11_DERS).
 */
export function maarifScope<T extends ScopeSubject>(track: "maarif_9" | "maarif_10" | "maarif_11", alan: Alan | null, subjects: T[]): T[] {
  const top = track === "maarif_9" ? 9 : track === "maarif_10" ? 10 : 11
  const ders11 = new Set<string>([...MAARIF_11_DERS.ortak, ...(alan ? MAARIF_11_DERS[alan] : [])])
  return subjects
    .filter((s) => s.curriculum === "maarif" && s.grade != null && s.grade >= 9 && s.grade <= top)
    .filter((s) => s.grade !== 11 || ders11.has(s.ders_key ?? ""))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

/** Profilin ilgilendiği dersler (tarama ve harita kapsamı). Sıra: TYT → AYT, kendi sırasıyla. */
export function scopeSubjects<T extends ScopeSubject>(
  profile: Pick<UpplanProfile, "segment" | "alan"> & { track?: Track | null },
  subjects: T[],
): T[] {
  const t = profile.track
  if (t === "maarif_9" || t === "maarif_10" || t === "maarif_11") return maarifScope(t, profile.alan, subjects)
  const normal = subjects.filter((s) => s.curriculum !== "maarif")
  if (profile.segment === "lgs") return normal.filter((s) => s.exam_type === "lgs")
  const ayt = new Set<string>(profile.alan ? ALAN_AYT_SUBJECTS[profile.alan] : [])
  const rank = (s: T) => (s.exam_type === "tyt" ? 0 : 1) * 1000 + (s.order ?? 0)
  return normal
    .filter((s) => s.exam_type === "tyt" || (s.exam_type === "ayt" && ayt.has(s.name)))
    .sort((a, b) => rank(a) - rank(b))
}
