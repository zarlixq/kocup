import { fromHHMM, type DraftItem } from "@/lib/upplan/scheduler"

// Öğrenci geri bildirimi (Faz C3) — saf yardımcılar (client'ta da kullanılır).
// "Değiştir": neden kodu upplan_feedback'e yazılır, ustalık/öncelik anında güncellenir
// (biliyorum → tarama 'biliyorum', çok zor → 'eksik', sıkıcı → öncelik cezası
// feedback_penalty_days gün), blok yenisiyle değişir ("zamanım yok" → kaldırılır).

export const FEEDBACK_REASONS = ["biliyorum", "cok_zor", "sikici", "zamanim_yok", "yanlis_ders"] as const
export type FeedbackReason = (typeof FEEDBACK_REASONS)[number]

export const FEEDBACK_LABEL: Record<FeedbackReason, string> = {
  biliyorum: "Bu konuyu biliyorum",
  cok_zor: "Çok zor",
  sikici: "Sıkıcı",
  zamanim_yok: "Zamanım yok",
  yanlis_ders: "Yanlış ders",
}

export function isFeedbackReason(v: unknown): v is FeedbackReason {
  return typeof v === "string" && (FEEDBACK_REASONS as readonly string[]).includes(v)
}

/** Neden koduna göre konu öz değerlendirmesi (ustalık trigger'la yeniden hesaplanır). */
export function assessmentFor(reason: FeedbackReason): "biliyorum" | "eksik" | null {
  if (reason === "biliyorum") return "biliyorum"
  if (reason === "cok_zor") return "eksik"
  return null
}

export type ReplacementCandidate = {
  topic_id: string
  topic_name: string
  subject_id: string
  subject_name: string
  priority: number
  assignment_id: string | null
  reason?: string
}

/**
 * Değiştirilen bloğun yerine aynı gün/saatte yeni soru bloğu: en yüksek öncelikli
 * aday; aynı konu, (yanlış ders dendiyse) aynı ders ve o gün zaten programda olan
 * konular hariç. "Zamanım yok" ya da uygun aday yoksa null (blok kaldırılır).
 */
export function replacementBlock(
  removed: DraftItem,
  reason: FeedbackReason,
  candidates: ReplacementCandidate[],
  dayItems: DraftItem[],
  minutesPerQuestion: number,
): DraftItem | null {
  if (reason === "zamanim_yok" || removed.block_type === "deneme") return null
  const busy = new Set(dayItems.filter((i) => i !== removed).map((i) => i.topic_id))
  const pick = [...candidates]
    .filter((c) => c.topic_id !== removed.topic_id && !busy.has(c.topic_id))
    .filter((c) => reason !== "yanlis_ders" || c.subject_id !== removed.subject_id)
    .sort((a, b) => b.priority - a.priority)[0]
  if (!pick) return null
  const minutes = fromHHMM(removed.end_time) - fromHHMM(removed.start_time)
  return {
    day_of_week: removed.day_of_week,
    start_time: removed.start_time,
    end_time: removed.end_time,
    subject_id: pick.subject_id,
    topic_id: pick.topic_id,
    assignment_id: pick.assignment_id,
    block_type: "soru_cozum",
    baslik: `Soru çözümü: ${pick.topic_name}`,
    hedef_soru: Math.max(1, Math.round(minutes / minutesPerQuestion)),
    neden: `Değiştirdiğin bloğun yerine: ${pick.reason ?? `${pick.subject_name} dersinde önceliği yüksek konu`}`,
  }
}
