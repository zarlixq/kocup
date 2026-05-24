export type RecurrenceRule = "weekly" | "biweekly"

/**
 * Verilen başlangıç tarihi ve kuraldan, bitiş tarihine kadar tekrar eden
 * randevu başlangıç zamanlarını üretir (parent dahil DEĞİL — sadece sonraki tekrarlar).
 */
export function expandRecurrence(
  start: Date,
  end: Date,
  rule: RecurrenceRule,
  recurrenceEndDate: Date,
): { start_time: Date; end_time: Date }[] {
  const result: { start_time: Date; end_time: Date }[] = []
  const stepDays = rule === "weekly" ? 7 : 14
  const durationMs = end.getTime() - start.getTime()

  const next = new Date(start)
  next.setDate(next.getDate() + stepDays)

  // recurrence_end_date'in son gününü dahil et
  const limit = new Date(recurrenceEndDate)
  limit.setHours(23, 59, 59, 999)

  while (next <= limit) {
    const childStart = new Date(next)
    const childEnd = new Date(childStart.getTime() + durationMs)
    result.push({ start_time: childStart, end_time: childEnd })
    next.setDate(next.getDate() + stepDays)
  }

  return result
}
