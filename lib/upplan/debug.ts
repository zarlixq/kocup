import type { Roadmap } from "@/lib/upplan/roadmap"
import type { Track } from "@/lib/upplan/track"

// Yol haritası tutarlılık kontrolleri (debug paneli ve invariant testleri ortak).

const EXAM_WORDS = /\b(YKS|TYT|AYT)\b/
const isYksSubject = (name: string) => /^(TYT|AYT) /.test(name)

/** Track'e aykırı durumlar; boş dizi = tutarlı. */
export function roadmapWarnings(track: Track | null, r: Pick<Roadmap, "items" | "notes" | "overflow" | "examDate" | "weeklyHours" | "track">, expectedExamDate?: string | null): string[] {
  const out: string[] = []
  if (!track) out.push("Track yok: sınıf seçilmemiş")
  const early = track === "maarif_9" || track === "maarif_10"
  const maarif = early || track === "maarif_11"
  if (maarif && r.items.some((i) => isYksSubject(i.subject_name))) out.push("Maarif track'inde TYT/AYT konusu var")
  if (!maarif && track && track !== "lgs" && r.items.some((i) => !isYksSubject(i.subject_name))) out.push("YKS track'inde Maarif konusu var")
  if (track === "maarif_9") {
    const texts = [...r.notes, r.overflow?.message ?? "", ...r.items.flatMap((i) => i.reasons)]
    if (texts.some((t) => EXAM_WORDS.test(t))) out.push("9. sınıf metninde YKS/TYT/AYT geçiyor")
  }
  if (early && r.overflow && /yetişemiyorsun/.test(r.overflow.message)) out.push("9-10 overflow mesajı sınav dilinde")
  if (expectedExamDate && r.examDate !== expectedExamDate) out.push(`Sınav/ufuk tarihi beklenenden farklı (${r.examDate} ≠ ${expectedExamDate})`)
  if (r.weeklyHours && r.weeklyHours.current === 0) out.push("Haftalık müsaitlik 0 iken üretilmiş")
  if (r.track && track && r.track !== track) out.push(`Yol haritası başka track için üretilmiş (${r.track})`)
  return out
}
