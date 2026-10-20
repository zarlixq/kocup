import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { istanbulWeekStartStr } from "@/lib/tz"
import { addWeeks } from "@/lib/week"

type Client = SupabaseClient<Database>

// ─────────────────────────────────────────────────────────────────────────
// HAFTALIK PROGRAM UYUMU — tek kaynak
// ─────────────────────────────────────────────────────────────────────────
// Bu dosya müdür + koç + öğrenci detay panellerinin PAYLAŞTIĞI tek uyum
// hesabıdır. Formül burada; her panel aynı sonucu görür (kopyalama yok).
//
// VARSAYIM / PRIMITIF:
//   Uyum, `weekly_programs` (student_id + week_start) ve `weekly_program_items`
//   (program_id + is_completed) tablolarından hesaplanır. Koç öğrenciye o haftaya
//   ait program maddeleri atar; öğrenci/koç tamamlananları işaretler.
//   Uyum% = tamamlanan_madde / toplam_madde × 100.
//
//   GÜN BAZLI (dailyCompliance): bugüne kadarki (bugün dahil) programlı günlerin
//   günlük tamamlama oranlarının ORTALAMASI. Salı 5/5 = %100, Çarşamba 0/5 = %0
//   → Çarşamba günü %50; Pazar günü haftanın tüm programlı günleri. Programı
//   olmayan günler ve gelecek günler hesaba girmez. Geçmiş haftalarda 7 gün.
//   Uyum gösterilen her yer (öğrenci, program, koç, müdür, kurum, UpPlan
//   haftalık güncellemenin %50 kuralı) bu dosyadaki fonksiyonu kullanır.
//
//   Bu KoçUp'taki gerçek "haftalık program tamamlama" primitifidir — proxy değil.
//   (topic_assignments / schedule / etut_schedule DEĞİL: schedule tabloları
//    tekrarlayan takvimdir, tamamlanma izi yoktur.)
//
//   Programı OLMAYAN öğrenci (o hafta madde yok) → uyum = null ("Program yok").
//   Program yokluğu uyumsuzluk (0%) DEĞİLDİR; ayrı bir durumdur.
//
// Kapsam RLS ile belirlenir (RPC SECURITY INVOKER):
//   müdür → tüm platform, koç → yalnız kendi öğrencileri.
// ─────────────────────────────────────────────────────────────────────────

export { complianceUptoDay, dailyCompliance, type DailyCompliance, type DayCount } from "@/lib/analytics/daily-compliance"
import { complianceUptoDay, dailyCompliance, type DayCount } from "@/lib/analytics/daily-compliance"

type DailyRaw = { student_id: string; day_of_week: number; total_items: number; done_items: number }

export type Compliance = {
  studentId: string
  totalItems: number
  doneItems: number
  /** 0–100 tam sayı; program yoksa null. */
  percent: number | null
}

function toComplianceMap(rows: DailyRaw[], weekStart: string, today?: string): Map<string, Compliance> {
  const upto = complianceUptoDay(weekStart, today)
  const byStudent = new Map<string, DayCount[]>()
  for (const r of rows) {
    const list = byStudent.get(r.student_id) ?? []
    list.push({ day_of_week: r.day_of_week, total: r.total_items, done: r.done_items })
    byStudent.set(r.student_id, list)
  }
  const map = new Map<string, Compliance>()
  for (const [studentId, days] of byStudent) {
    const c = dailyCompliance(days, upto)
    map.set(studentId, { studentId, totalItems: c.totalItems, doneItems: c.doneItems, percent: c.percent })
  }
  return map
}

/**
 * Verilen haftadaki (weekStart = Pazartesi, YYYY-MM-DD) tüm görünür öğrencilerin
 * uyumu. Kapsam çağıranın RLS'ine göre (müdür=tüm, koç=kendi öğrencileri).
 * weekStart verilmezse Istanbul takviminde içinde bulunulan hafta kullanılır.
 * Dönüş: studentId → Compliance haritası (yalnız programı olanlar yer alır).
 */
export async function getWeeklyComplianceMap(
  supabase: Client,
  weekStart: string = istanbulWeekStartStr(),
): Promise<Map<string, Compliance>> {
  const { data, error } = await supabase.rpc("weekly_program_daily_compliance", {
    p_week_start: weekStart,
  })
  if (error) {
    console.error("weekly_program_daily_compliance hatası:", error)
    return new Map()
  }
  return toComplianceMap(data ?? [], weekStart)
}

/**
 * Tek öğrenci için haftalık uyum. Program yoksa null döner.
 */
export async function getStudentWeeklyCompliance(
  supabase: Client,
  studentId: string,
  weekStart: string = istanbulWeekStartStr(),
): Promise<Compliance | null> {
  const { data, error } = await supabase.rpc("weekly_program_daily_compliance", {
    p_week_start: weekStart,
    p_student_id: studentId,
  })
  if (error) {
    console.error("weekly_program_daily_compliance (tekil) hatası:", error)
    return null
  }
  return toComplianceMap(data ?? [], weekStart).get(studentId) ?? null
}

// ── UI yardımcıları (uyum rozeti renk/etiket eşiği) ──────────────────────
export type ComplianceTone = "none" | "low" | "mid" | "high"

export function complianceTone(percent: number | null): ComplianceTone {
  if (percent === null) return "none"
  if (percent >= 80) return "high"
  if (percent >= 50) return "mid"
  return "low"
}

export const COMPLIANCE_TONE_CLASS: Record<ComplianceTone, string> = {
  none: "bg-zinc-100 text-zinc-500",
  low: "bg-red-50 text-red-700",
  mid: "bg-amber-50 text-amber-700",
  high: "bg-green-50 text-green-700",
}

export function formatCompliance(percent: number | null): string {
  return percent === null ? "Program yok" : `%${percent}`
}

export type ComplianceWeek = { weekStart: string; compliance: Compliance | null }

/**
 * Öğrencinin son `weeks` haftalık uyumu (eskiden yeniye; son eleman bu hafta).
 * Öğrenci kendi panelinde de çağırır — RPC SECURITY INVOKER, RLS kendi satırlarına süzer.
 */
export async function getStudentComplianceHistory(
  supabase: Client,
  studentId: string,
  weeks = 4,
  currentWeekStart: string = istanbulWeekStartStr(),
): Promise<ComplianceWeek[]> {
  const starts = Array.from({ length: weeks }, (_, i) => addWeeks(currentWeekStart, i - (weeks - 1)))
  const results = await Promise.all(starts.map((ws) => getStudentWeeklyCompliance(supabase, studentId, ws)))
  return starts.map((weekStart, i) => ({ weekStart, compliance: results[i] }))
}
