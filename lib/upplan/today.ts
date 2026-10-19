import {
  ALERT_EXAM_SUBJECT_WRONGS,
  REVIEW_MAX,
  REVIEW_MIN_DROP,
  REVIEW_QUESTIONS,
} from "@/lib/upplan/config"
import { daysSince } from "@/lib/upplan/mastery"

// Bugün ekranı kararları — saf fonksiyonlar (test edilir).

export type ReviewCandidate = {
  topic_id: string
  topic_name: string
  stored: number
  effective: number
  last_practiced_at: string | null
}

export type ReviewSuggestion = {
  topic_id: string
  topic_name: string
  days: number
  questions: number
  drop: number
}

/** Etkili skoru en çok düşmüş (unutma) 1-2 konu. */
export function pickReviews(rows: ReviewCandidate[], today: string): ReviewSuggestion[] {
  return rows
    .filter((r): r is ReviewCandidate & { last_practiced_at: string } => r.last_practiced_at !== null)
    .map((r) => ({
      topic_id: r.topic_id,
      topic_name: r.topic_name,
      days: daysSince(r.last_practiced_at, today),
      questions: REVIEW_QUESTIONS,
      drop: Math.round((r.stored - r.effective) * 100) / 100,
    }))
    .filter((r) => r.drop >= REVIEW_MIN_DROP)
    .sort((a, b) => b.drop - a.drop || b.days - a.days)
    .slice(0, REVIEW_MAX)
}

export function reviewText(r: ReviewSuggestion): string {
  return `${r.topic_name} konusuna ${r.days} gündür dokunmadın, ${r.questions} soruluk tekrar`
}

export type OverconfidentTopic = { topic_id: string; topic_name: string; effective: number }

export type LastExamSignal = {
  exam_id: string
  exam_name: string
  /** Dersin yanlış sayısı ve konulara dağıtılmış kısmı. */
  subjects: { subject_name: string; wrong: number; distributed: number }[]
}

export type TodayAlert =
  | { kind: "overconfident"; topics: OverconfidentTopic[] }
  | { kind: "exam_subject"; exam_id: string; exam_name: string; subject_name: string; wrong: number }

/**
 * En fazla 1 uyarı — en önemli tek sinyal:
 *   1) kendini fazla iyi değerlendirdiği konu(lar) (deneme kanıtıyla),
 *   2) son denemede bir derste ≥ eşik yanlış ve henüz konulara dağıtılmamış.
 */
export function pickAlert(overconfident: OverconfidentTopic[], lastExam: LastExamSignal | null): TodayAlert | null {
  if (overconfident.length > 0) return { kind: "overconfident", topics: overconfident.slice(0, 3) }
  if (lastExam) {
    const worst = lastExam.subjects
      .filter((s) => s.wrong >= ALERT_EXAM_SUBJECT_WRONGS && s.distributed < s.wrong)
      .sort((a, b) => b.wrong - a.wrong)[0]
    if (worst) {
      return {
        kind: "exam_subject",
        exam_id: lastExam.exam_id,
        exam_name: lastExam.exam_name,
        subject_name: worst.subject_name,
        wrong: worst.wrong,
      }
    }
  }
  return null
}
