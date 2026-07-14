import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { istanbulWeekStartStr } from "@/lib/tz"

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

export type ComplianceRaw = {
  student_id: string
  total_items: number
  done_items: number
}

export type Compliance = {
  studentId: string
  totalItems: number
  doneItems: number
  /** 0–100 tam sayı; program yoksa null. */
  percent: number | null
}

/** Tek yer: ham madde sayımından uyum yüzdesi. */
export function computeCompliancePercent(totalItems: number, doneItems: number): number | null {
  if (totalItems <= 0) return null
  return Math.round((doneItems / totalItems) * 100)
}

function toCompliance(raw: ComplianceRaw): Compliance {
  return {
    studentId: raw.student_id,
    totalItems: raw.total_items,
    doneItems: raw.done_items,
    percent: computeCompliancePercent(raw.total_items, raw.done_items),
  }
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
  const { data, error } = await supabase.rpc("weekly_program_compliance", {
    p_week_start: weekStart,
  })
  if (error) {
    console.error("weekly_program_compliance hatası:", error)
    return new Map()
  }
  const map = new Map<string, Compliance>()
  for (const row of (data ?? []) as ComplianceRaw[]) {
    map.set(row.student_id, toCompliance(row))
  }
  return map
}

/**
 * Tek öğrenci için haftalık uyum. Program yoksa null döner.
 */
export async function getStudentWeeklyCompliance(
  supabase: Client,
  studentId: string,
  weekStart: string = istanbulWeekStartStr(),
): Promise<Compliance | null> {
  const { data, error } = await supabase.rpc("weekly_program_compliance", {
    p_week_start: weekStart,
    p_student_id: studentId,
  })
  if (error) {
    console.error("weekly_program_compliance (tekil) hatası:", error)
    return null
  }
  const row = ((data ?? []) as ComplianceRaw[])[0]
  return row ? toCompliance(row) : null
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
