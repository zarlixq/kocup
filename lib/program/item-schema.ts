import { z } from "zod"

// Haftalık program kalemi — koç ve öğrenci action'larının ORTAK şeması.
// Saatler "HH:MM"; bitiş için başlangıç zorunlu ve bitiş > başlangıç
// (DB: weekly_program_items_time_check, migration 201).

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

const optionalTime = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v && v.length > 0 ? v : null))
  .refine((v) => v == null || TIME_RE.test(v), { message: "Saat SS:DD biçiminde olmalı." })

export const programItemSchema = z
  .object({
    day_of_week: z.coerce.number().int().min(1).max(7),
    start_time: optionalTime,
    end_time: optionalTime,
    subject_id: z
      .string()
      .uuid()
      .nullish()
      .transform((v) => v ?? null),
    topic_id: z
      .string()
      .uuid()
      .nullish()
      .transform((v) => v ?? null),
    baslik: z
      .string()
      .trim()
      .max(120)
      .nullish()
      .transform((v) => (v && v.length > 0 ? v : null)),
    aciklama: z
      .string()
      .trim()
      .max(500)
      .nullish()
      .transform((v) => (v && v.length > 0 ? v : null)),
    hedef_soru: z.coerce
      .number()
      .int()
      .min(1, "Hedef soru en az 1 olmalı.")
      .max(2000)
      .nullish()
      .transform((v) => v ?? null),
  })
  .refine((d) => d.subject_id || d.baslik, {
    message: "Ders seç veya konu/başlık gir.",
    path: ["baslik"],
  })
  .refine((d) => !d.topic_id || d.subject_id, {
    message: "Konu seçmek için önce ders seç.",
    path: ["topic_id"],
  })
  .refine((d) => !d.end_time || (d.start_time && d.end_time > d.start_time), {
    message: "Bitiş saati başlangıçtan sonra olmalı.",
    path: ["end_time"],
  })

export type ProgramItemInput = z.input<typeof programItemSchema>
export type ProgramItemValues = z.output<typeof programItemSchema>

/** DB'ye yazılacak kolonlar (insert/update ortak). */
export function toItemColumns(v: ProgramItemValues) {
  return {
    day_of_week: v.day_of_week,
    start_time: v.start_time,
    end_time: v.end_time,
    subject_id: v.subject_id,
    topic_id: v.topic_id,
    baslik: v.baslik,
    aciklama: v.aciklama,
    hedef_soru: v.hedef_soru,
  }
}

/** DB "14:00:00" → "14:00" */
export function shortTime(t: string | null | undefined): string | null {
  return t ? t.slice(0, 5) : null
}
