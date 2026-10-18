import { istanbulDateStr, istanbulWeekStartStr } from "@/lib/tz"

// Soru çözüm sayfası özetleri — saf fonksiyonlar (Istanbul takvimi).
// Tarihler YYYY-MM-DD string; aritmetik UTC'de sabitlenmiş takvim günüyle yapılır.

export type SessionStat = {
  date: string
  subject_id: string
  subject_name: string
  topic_id: string | null
  topic_name: string | null
  total_questions: number
  correct: number
}

export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const t = new Date(Date.UTC(y, m - 1, d))
  t.setUTCDate(t.getUTCDate() + n)
  return t.toISOString().slice(0, 10)
}

export function accuracyPct(correct: number, total: number): number | null {
  return total > 0 ? Math.round((correct / total) * 100) : null
}

// Bugünle (bugün kayıt yoksa dünle) biten ardışık kayıtlı gün sayısı.
// Bugün henüz kayıt girmemiş öğrencinin serisi gün bitene kadar kırılmaz.
export function dailyStreak(dates: Iterable<string>, today: string): { days: number; activeToday: boolean } {
  const set = new Set(dates)
  const activeToday = set.has(today)
  let cursor = activeToday ? today : addDays(today, -1)
  let days = 0
  while (set.has(cursor)) {
    days++
    cursor = addDays(cursor, -1)
  }
  return { days, activeToday }
}

export type WeeklySummary = {
  weekStart: string
  today: string
  total: number
  prevTotal: number
  correct: number
  accuracy: number | null
  topSubject: { name: string; total: number } | null
}

// Bu hafta (Pazartesi → bugün) ve geçen haftanın AYNI dönemi (Pzt → bugünün
// 7 gün öncesi) — yarım haftayı tam haftayla kıyaslamamak için.
export function weeklySummary(sessions: SessionStat[], now: Date = new Date()): WeeklySummary {
  const today = istanbulDateStr(now)
  const weekStart = istanbulWeekStartStr(now)
  const prevStart = addDays(weekStart, -7)
  const prevEnd = addDays(today, -7)

  let total = 0
  let correct = 0
  let prevTotal = 0
  const bySubject = new Map<string, { name: string; total: number }>()

  for (const s of sessions) {
    if (s.date >= weekStart && s.date <= today) {
      total += s.total_questions
      correct += s.correct
      const cur = bySubject.get(s.subject_id) ?? { name: s.subject_name, total: 0 }
      cur.total += s.total_questions
      bySubject.set(s.subject_id, cur)
    } else if (s.date >= prevStart && s.date <= prevEnd) {
      prevTotal += s.total_questions
    }
  }

  let topSubject: WeeklySummary["topSubject"] = null
  for (const v of bySubject.values()) {
    if (!topSubject || v.total > topSubject.total) topSubject = v
  }

  return { weekStart, today, total, prevTotal, correct, accuracy: accuracyPct(correct, total), topSubject }
}

export type AccuracyRow = { id: string; name: string; total: number; correct: number; accuracy: number }

// by="subject" → ders bazlı; by="topic" → konu bazlı (ders filtresi seçiliyken).
// Konusu olmayan eski kayıtlar konu modunda "Konu belirtilmemiş" altında toplanır.
export function accuracyBreakdown(sessions: SessionStat[], by: "subject" | "topic"): AccuracyRow[] {
  const map = new Map<string, AccuracyRow>()
  for (const s of sessions) {
    const id = by === "subject" ? s.subject_id : s.topic_id ?? "__none__"
    const name = by === "subject" ? s.subject_name : s.topic_name ?? "Konu belirtilmemiş"
    const cur = map.get(id) ?? { id, name, total: 0, correct: 0, accuracy: 0 }
    cur.total += s.total_questions
    cur.correct += s.correct
    map.set(id, cur)
  }
  return Array.from(map.values())
    .filter((r) => r.total > 0)
    .map((r) => ({ ...r, accuracy: accuracyPct(r.correct, r.total) ?? 0 }))
    .sort((a, b) => b.total - a.total)
}

export type DayGroup<T> = { date: string; items: T[]; total: number; correct: number }

// Tarihe göre azalan gün grupları; grup içi sıra korunur.
export function groupByDay<T extends { date: string; total_questions: number; correct: number }>(
  rows: T[],
): DayGroup<T>[] {
  const map = new Map<string, DayGroup<T>>()
  for (const r of rows) {
    const g = map.get(r.date) ?? { date: r.date, items: [], total: 0, correct: 0 }
    g.items.push(r)
    g.total += r.total_questions
    g.correct += r.correct
    map.set(r.date, g)
  }
  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1))
}
