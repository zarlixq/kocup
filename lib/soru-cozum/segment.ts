import { gradeToExamTypes } from "@/lib/exam-target"

// Soru kaydı formundaki "Sınav" adımı. Normal müfredatta exam_type (TYT/AYT/LGS),
// Maarif müfredatında sınıf ("Okul · 9. Sınıf") bir sınav anahtarıdır.

export type SegmentSubject = {
  id: string
  name: string
  exam_type: string | null
  grade: number | null
  curriculum: string | null
  order: number | null
}

export type ExamOption = { key: string; label: string }

const EXAM_ORDER: Record<string, number> = { lgs: 1, tyt: 2, ayt: 3 }

export function subjectExamKey(s: Pick<SegmentSubject, "exam_type" | "grade" | "curriculum">): string {
  if (s.curriculum === "maarif" && s.grade != null) return `maarif-${s.grade}`
  return s.exam_type ?? "diger"
}

export function examKeyLabel(key: string): string {
  if (key.startsWith("maarif-")) return `Okul · ${key.slice(7)}. Sınıf`
  if (key === "diger") return "Diğer"
  return key.toUpperCase()
}

// Öğrencinin sınıfına göre gösterilecek sınav seçenekleri.
// - 7/8 → LGS; 9-12/Mezun → TYT + AYT (lib/exam-target ile aynı kural).
// - Öğrencinin sınıfına ait Maarif dersleri varsa "Okul · N. Sınıf" da eklenir.
// - Sınıf bilinmiyorsa dersi olan tüm seçenekler.
// - `alwaysInclude`: düzenlenen kaydın mevcut sınavı (sınıf değişmiş olsa bile kaybolmasın).
export function examOptionsFor(
  grade: string | null | undefined,
  subjects: SegmentSubject[],
  alwaysInclude?: string | null,
): ExamOption[] {
  const available = new Set(subjects.map(subjectExamKey))
  const keys = new Set<string>()

  if (!grade) {
    available.forEach((k) => keys.add(k))
  } else {
    for (const t of gradeToExamTypes(grade)) if (available.has(t)) keys.add(t)
    const maarifKey = `maarif-${grade}`
    if (available.has(maarifKey)) keys.add(maarifKey)
  }
  if (alwaysInclude && available.has(alwaysInclude)) keys.add(alwaysInclude)

  const weight = (k: string) =>
    k.startsWith("maarif-") ? 100 + Number(k.slice(7)) : EXAM_ORDER[k] ?? 50
  return Array.from(keys)
    .sort((a, b) => weight(a) - weight(b))
    .map((key) => ({ key, label: examKeyLabel(key) }))
}

export function subjectsForExam<T extends SegmentSubject>(subjects: T[], examKey: string): T[] {
  return subjects
    .filter((s) => subjectExamKey(s) === examKey)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}
