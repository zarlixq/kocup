import { z } from "zod"
import { ALAN_AYT_SUBJECTS, FOCUS_OPTIONS, SLOTS_PER_DAY, type FocusMinutes } from "@/lib/upplan/config"

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
  })
  .refine((p) => p.segment === "lgs" || p.alan !== null, { message: "Alanını seç.", path: ["alan"] })
  .refine((p) => p.status !== "lise" || p.grade !== null, { message: "Sınıfını seç.", path: ["grade"] })

export type ProfileInput = z.input<typeof profileSchema>

/** students.grade ("7".."12" | "Mezun") → profil ön değerleri. */
export function defaultsFromGrade(grade: string | null): Pick<UpplanProfile, "status" | "grade" | "segment"> {
  if (grade === "Mezun") return { status: "mezun", grade: null, segment: "yks" }
  const n = grade ? Number(grade) : NaN
  if (Number.isInteger(n)) return { status: "lise", grade: n, segment: n <= 8 ? "lgs" : "yks" }
  return { status: "lise", grade: null, segment: "yks" }
}

export type ScopeSubject = { id: string; name: string; exam_type: string | null; curriculum: string | null; order: number | null }

/** Profilin ilgilendiği dersler (tarama ve harita kapsamı). Sıra: TYT → AYT, kendi sırasıyla. */
export function scopeSubjects<T extends ScopeSubject>(
  profile: Pick<UpplanProfile, "segment" | "alan">,
  subjects: T[],
): T[] {
  const normal = subjects.filter((s) => s.curriculum !== "maarif")
  if (profile.segment === "lgs") return normal.filter((s) => s.exam_type === "lgs")
  const ayt = new Set<string>(profile.alan ? ALAN_AYT_SUBJECTS[profile.alan] : [])
  const rank = (s: T) => (s.exam_type === "tyt" ? 0 : 1) * 1000 + (s.order ?? 0)
  return normal
    .filter((s) => s.exam_type === "tyt" || (s.exam_type === "ayt" && ayt.has(s.name)))
    .sort((a, b) => rank(a) - rank(b))
}
