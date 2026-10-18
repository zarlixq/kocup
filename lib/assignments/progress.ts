// Konu hedefi / ataması ilerlemesi — TEK kaynak (öğrenci, koç, müdür sayfaları).
//
// Bir soru çözüm kaydı bir hedefe sayılır ⇔
//   (a) kayıt doğrudan o hedefe bağlıysa (study_sessions.assignment_id = hedef.id), veya
//   (b) bağlı değilse, aynı konudaysa (topic_id) ve hedefin tarih aralığındaysa
//       (baslangic_tarihi ≤ date ≤ son_tarih).
// (b) sayesinde öğrenci Soru Çözüm sayfasından konu seçerek girdiği her kayıtla
// hedefini otomatik ilerletir; ayrıca "ilerleme gir" gerekmez.

export type ProgressSession = {
  assignment_id: string | null
  topic_id: string | null
  date: string
  total_questions: number
  correct: number
  duration_minutes: number | null
}

export type ProgressAssignment = {
  id: string
  topic_id: string
  baslangic_tarihi: string
  son_tarih: string
}

export type GoalProgress = {
  cozulen: number
  dogru: number
  sure: number
}

export function sessionCountsFor(s: ProgressSession, a: ProgressAssignment): boolean {
  if (s.assignment_id) return s.assignment_id === a.id
  return s.topic_id === a.topic_id && s.date >= a.baslangic_tarihi && s.date <= a.son_tarih
}

export function computeAssignmentProgress(
  assignments: ProgressAssignment[],
  sessions: ProgressSession[],
): Map<string, GoalProgress> {
  const map = new Map<string, GoalProgress>()
  for (const a of assignments) map.set(a.id, { cozulen: 0, dogru: 0, sure: 0 })
  for (const s of sessions) {
    for (const a of assignments) {
      if (!sessionCountsFor(s, a)) continue
      const cur = map.get(a.id)!
      cur.cozulen += s.total_questions
      cur.dogru += s.correct
      cur.sure += s.duration_minutes ?? 0
    }
  }
  return map
}

// Sorgu yardımcıları: hedef ilerlemesi için study_sessions'tan çekilecek kolonlar.
export const PROGRESS_SESSION_COLUMNS = "student_id, assignment_id, topic_id, date, total_questions, correct, duration_minutes"
