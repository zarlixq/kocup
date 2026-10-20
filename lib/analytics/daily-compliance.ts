import { istanbulDateStr } from "@/lib/tz"

// Gün bazlı haftalık uyum — saf, istemcide de kullanılır (program panosu).
// Açıklama ve kullanım: lib/analytics/compliance.ts.

export type DayCount = { day_of_week: number; total: number; done: number }

export type DailyCompliance = {
  /** 0–100 tam sayı; sayılacak programlı gün yoksa null. */
  percent: number | null
  /** Sayılan günlerdeki kalemler (gösterim için). */
  totalItems: number
  doneItems: number
  countedDays: number
}

/**
 * Gün bazlı uyum (TEK FONKSİYON). uptoDay: bugünün haftadaki günü (1=Pzt..7=Paz);
 * geçmiş hafta için 7, gelecek hafta için 0. uptoDay'den sonraki günler ve
 * kalemi olmayan günler sayılmaz.
 */
export function dailyCompliance(days: DayCount[], uptoDay: number): DailyCompliance {
  let sum = 0
  let counted = 0
  let total = 0
  let done = 0
  for (const d of days) {
    if (d.day_of_week > uptoDay || d.total <= 0) continue
    sum += d.done / d.total
    counted += 1
    total += d.total
    done += d.done
  }
  return { percent: counted ? Math.round((sum / counted) * 100) : null, totalItems: total, doneItems: done, countedDays: counted }
}

/** Haftanın hangi gününe kadar sayılır: içinde bulunulan hafta → bugün, geçmiş → 7, gelecek → 0. */
export function complianceUptoDay(weekStart: string, today: string = istanbulDateStr()): number {
  const diff = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${weekStart}T00:00:00Z`)) / 86_400_000)
  if (diff < 0) return 0
  return Math.min(diff + 1, 7)
}

