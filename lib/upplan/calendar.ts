import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { eduYearLabel } from "@/lib/upplan/track"

type Client = SupabaseClient<Database>

// Sınav ve okul takvimi (migration 227: exam_calendar, school_calendar_weeks,
// school_calendar_breaks). Sınav tarihi kodda tutulmaz; buradan okunur.

export type ExamStyle = "klasik" | "baglam_temelli"
export type ExamCalendarRow = { exam_type: "yks" | "lgs"; exam_year: number; exam_date: string; question_style: ExamStyle; tahmini: boolean }
export type ExamCalendar = ExamCalendarRow[]

export type SchoolWeek = { week_no: number; starts_on: string; is_exam_week: boolean }
export type SchoolBreak = { kind: "ara_tatil" | "yariyil" | "yaz"; starts_on: string; ends_on: string }
export type SchoolCalendar = { eduYear: string; weeks: SchoolWeek[]; breaks: SchoolBreak[] }

export function examFor(cal: ExamCalendar, type: "yks" | "lgs", year: number | null): ExamCalendarRow | null {
  if (year === null) return null
  return cal.find((r) => r.exam_type === type && r.exam_year === year) ?? null
}

export type SchoolPosition = {
  /** İçinde bulunulan ders haftası (tatildeyse son biten hafta; yıl başlamadıysa 0). */
  week: number
  /** Tatildeyse türü. */
  inBreak: SchoolBreak["kind"] | null
  isExamWeek: boolean
}

/** Tarihin okul takvimindeki yeri. */
export function schoolPosition(cal: SchoolCalendar, date: string): SchoolPosition {
  const br = cal.breaks.find((b) => date >= b.starts_on && date <= b.ends_on) ?? null
  let week = 0
  let exam = false
  for (const w of cal.weeks) {
    if (w.starts_on <= date) {
      week = w.week_no
      exam = w.is_exam_week
    }
  }
  return { week, inBreak: br?.kind ?? null, isExamWeek: !br && exam }
}

export function isBreakDay(cal: SchoolCalendar, date: string): boolean {
  return cal.breaks.some((b) => date >= b.starts_on && date <= b.ends_on)
}

export async function loadExamCalendar(db: Client): Promise<ExamCalendar> {
  const { data, error } = await db.from("exam_calendar").select("exam_type, exam_year, exam_date, question_style, tahmini")
  if (error) console.error("loadExamCalendar", error)
  return (data ?? []).map((r) => ({
    exam_type: r.exam_type === "lgs" ? "lgs" : "yks",
    exam_year: r.exam_year,
    exam_date: r.exam_date,
    question_style: r.question_style === "baglam_temelli" ? "baglam_temelli" : "klasik",
    tahmini: r.tahmini,
  }))
}

export async function loadSchoolCalendar(db: Client, today: string): Promise<SchoolCalendar> {
  const eduYear = eduYearLabel(today)
  const [{ data: weeks, error: we }, { data: breaks, error: be }] = await Promise.all([
    db.from("school_calendar_weeks").select("week_no, starts_on, is_exam_week").eq("edu_year", eduYear).order("week_no"),
    db.from("school_calendar_breaks").select("kind, starts_on, ends_on").eq("edu_year", eduYear),
  ])
  if (we || be) console.error("loadSchoolCalendar", we ?? be)
  return {
    eduYear,
    weeks: weeks ?? [],
    breaks: (breaks ?? []).filter((b): b is SchoolBreak => b.kind === "ara_tatil" || b.kind === "yariyil" || b.kind === "yaz"),
  }
}
