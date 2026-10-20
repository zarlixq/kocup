import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { istanbulDateStr, istanbulWeekStartStr } from "@/lib/tz"
import { complianceUptoDay, dailyCompliance, type DayCount } from "@/lib/analytics/compliance"
import {
  BIG_SHIFT_DAYS,
  LOAD_FACTOR_MIN,
  LOAD_FACTOR_RECOVERY,
  LOAD_FACTOR_STEP,
  LOW_COMPLIANCE,
} from "@/lib/upplan/config"
import { addDaysIso } from "@/lib/upplan/roadmap"
import { extendBehindGoals, redateQueue, syncRoadmapProgress } from "@/lib/upplan/roadmap-service"
import { generateProgramDraft } from "@/lib/upplan/program-service"

type Client = SupabaseClient<Database>

type Notice = Database["public"]["Tables"]["upplan_notifications"]["Insert"]

/** Uyuma göre yeni yük çarpanı (saf). */
export function nextLoadFactor(current: number, compliance: number | null): number {
  if (compliance === null) return current
  const next = compliance < LOW_COMPLIANCE ? current - LOAD_FACTOR_STEP : current + LOAD_FACTOR_RECOVERY
  return Math.round(Math.min(1, Math.max(LOAD_FACTOR_MIN, next)) * 100) / 100
}

export type WeeklyReport = {
  studentId: string
  completed: number
  opened: number
  extended: number
  shifted: number
  overflowed: number
  loadFactor: number | null
  draftItems: number | null
  error?: string
}

/**
 * Pazar akşamı haftalık güncelleme (tek öğrenci):
 *  1) ilerleme senkronu (biten kapanır, sıradaki açılır — öndeyse erken),
 *  2) geride kalan aktif hedeflerin bitişi uzar,
 *  3) kuyruk (sonraki dalgalar) yeniden tarihlenir; 2+ hafta kayma ve
 *     "zaman kalırsa"ya düşme bildirim olur,
 *  4) geçen haftanın uyumu %50 altıysa yük çarpanı azalır (iyiyse toparlanır),
 *  5) gelecek haftanın program taslağı üretilir.
 */
export async function runWeeklyUpdate(admin: Client, studentId: string, now = new Date()): Promise<WeeklyReport> {
  const today = istanbulDateStr(now)
  const thisWeek = istanbulWeekStartStr(now)
  const nextWeek = addDaysIso(thisWeek, 7)
  const notices: Notice[] = []
  const report: WeeklyReport = { studentId, completed: 0, opened: 0, extended: 0, shifted: 0, overflowed: 0, loadFactor: null, draftItems: null }

  const events = await syncRoadmapProgress(admin, studentId, today)
  report.completed = events.filter((e) => e.kind === "tamamlandi").length
  report.opened = events.filter((e) => e.kind !== "tamamlandi").length

  const extended = await extendBehindGoals(admin, studentId, today)
  report.extended = extended.length
  const { shifted, overflowed } = await redateQueue(admin, studentId, today)
  report.shifted = shifted.length
  report.overflowed = overflowed.length
  for (const e of [...extended, ...shifted].filter((x, i, arr) => arr.findIndex((y) => y.name === x.name) === i)) {
    if (e.days >= BIG_SHIFT_DAYS) notices.push({ student_id: studentId, kind: "kayma", message: `${e.name} ${Math.round(e.days / 7)} hafta kaydı; geride kalan hedeflerin yüzünden takvim ileri alındı.` })
  }
  if (overflowed.length) {
    notices.push({
      student_id: studentId,
      kind: "zaman_kalirsa",
      message: `Bu tempoyla ${overflowed.length} konu sınav öncesine yetişmiyor ve "zaman kalırsa"ya alındı: ${overflowed.slice(0, 3).join(", ")}${overflowed.length > 3 ? "…" : ""}`.slice(0, 500),
    })
  }

  // Geçen haftanın uyumu → yük çarpanı.
  const { data: profile } = await admin.from("student_upplan_profile").select("load_factor").eq("student_id", studentId).maybeSingle()
  if (profile) {
    const { data: prog } = await admin
      .from("weekly_programs")
      .select("weekly_program_items(day_of_week, is_completed)")
      .eq("student_id", studentId)
      .eq("week_start", thisWeek)
      .maybeSingle()
    // Gün bazlı uyum (her ekranla aynı fonksiyon); Pazar akşamı → haftanın tamamı.
    const days = new Map<number, DayCount>()
    for (const i of prog?.weekly_program_items ?? []) {
      const d = days.get(i.day_of_week) ?? { day_of_week: i.day_of_week, total: 0, done: 0 }
      d.total += 1
      if (i.is_completed) d.done += 1
      days.set(i.day_of_week, d)
    }
    const pct = dailyCompliance(Array.from(days.values()), complianceUptoDay(thisWeek, today)).percent
    const compliance = pct === null ? null : pct / 100
    const current = Number(profile.load_factor)
    const lf = nextLoadFactor(current, compliance)
    report.loadFactor = lf
    if (lf !== current) {
      await admin.from("student_upplan_profile").update({ load_factor: lf, last_weekly_run_at: new Date().toISOString() }).eq("student_id", studentId)
      if (lf < current) {
        notices.push({
          student_id: studentId,
          kind: "yuk_azaldi",
          message: `Bu hafta programındaki çalışmaların %${Math.round((compliance ?? 0) * 100)} kadarını tamamladın; gelecek haftanın yükünü biraz azalttık.`,
        })
      }
    } else {
      await admin.from("student_upplan_profile").update({ last_weekly_run_at: new Date().toISOString() }).eq("student_id", studentId)
    }

    const draft = await generateProgramDraft(admin, studentId, nextWeek, nextWeek)
    if ("error" in draft) report.error = draft.error
    else {
      report.draftItems = draft.items.length
      notices.push({
        student_id: studentId,
        kind: "yeni_hafta",
        message: draft.coached ? "Yeni haftanın program önerisi koçuna iletildi." : "Yeni haftan hazır: program taslağını gözden geçirip onayla.",
      })
    }
  }

  if (notices.length) await admin.from("upplan_notifications").insert(notices)
  return report
}
