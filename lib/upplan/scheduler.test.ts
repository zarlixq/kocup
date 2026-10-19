import { describe, expect, it } from "vitest"
import { scheduleWeek, slotsToIntervals, spacedReviewsDue, toHHMM, type ProgramGoal, type ScheduleInput } from "@/lib/upplan/scheduler"

// Izgara 06:00'dan başlar, slot 30 dk → 17:00 = slot 22, 22:00 = slot 32.
const range = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => from + i)
const WEEKDAY_EVENING = range(22, 32) // 17:00–22:00
const WEEKEND_DAY = range(8, 24) // 10:00–18:00
const AVAIL = { "1": WEEKDAY_EVENING, "2": WEEKDAY_EVENING, "3": WEEKDAY_EVENING, "4": WEEKDAY_EVENING, "5": WEEKDAY_EVENING, "6": WEEKEND_DAY, "7": WEEKEND_DAY }

function goal(id: string, over: Partial<ProgramGoal> = {}): ProgramGoal {
  return {
    assignment_id: id,
    topic_id: `t-${id}`,
    topic_name: id,
    subject_id: `s-${id}`,
    subject_name: `Ders ${id}`,
    block_type: "soru_cozum",
    remaining_questions: 80,
    lecture_pending: false,
    son_tarih: "2026-11-15",
    scheduled_blocks: 0,
    ...over,
  }
}

const base: ScheduleInput = {
  weekStart: "2026-10-19",
  today: "2026-10-19",
  availability: AVAIL,
  focusMinutes: 45,
  loadFactor: 1,
  segment: "yks",
  weeksLeft: 30,
  minutesPerQuestion: 1.5,
  goals: [],
  reviews: [],
  fixed: [],
}

describe("yardımcılar", () => {
  it("ardışık slotlar tek aralık", () => {
    expect(slotsToIntervals([22, 23, 24, 30])).toEqual([
      [17 * 60, 18 * 60 + 30],
      [21 * 60, 21 * 60 + 30],
    ])
    expect(toHHMM(17 * 60 + 5)).toBe("17:05")
  })
  it("aralıklı tekrar vadesi bu haftaya düşen ilk ofset", () => {
    expect(spacedReviewsDue([{ topic_id: "x", completed_on: "2026-10-16" }], "2026-10-19", [3, 7, 21])).toEqual([
      { topic_id: "x", due: "2026-10-19" },
    ])
  })
})

describe("scheduleWeek", () => {
  it("deneme hafta sonu sabahı; >12 hafta → haftada 1", () => {
    const r = scheduleWeek(base)
    const exams = r.items.filter((i) => i.block_type === "deneme")
    expect(exams).toHaveLength(1)
    expect(exams[0]).toMatchObject({ day_of_week: 6, start_time: "10:00", end_time: "12:45" })
  })

  it("günde aynı dersten en fazla 2 blok", () => {
    const r = scheduleWeek({ ...base, goals: [goal("a", { remaining_questions: 400, son_tarih: "2026-10-25" })] })
    const perDay = new Map<number, number>()
    for (const i of r.items.filter((x) => x.assignment_id === "a")) perDay.set(i.day_of_week, (perDay.get(i.day_of_week) ?? 0) + 1)
    expect(Math.max(...perDay.values())).toBeLessThanOrEqual(2)
  })

  it("konu çalışması günün ilk bloğuna; bloklar hedefe bağlı", () => {
    const r = scheduleWeek({
      ...base,
      goals: [goal("a"), goal("b", { block_type: "konu_calisma", lecture_pending: true, remaining_questions: 120 })],
    })
    const lecture = r.items.find((i) => i.block_type === "konu_calisma")!
    expect(lecture.assignment_id).toBe("b")
    expect(lecture.baslik).toBe("Konu çalışması: b")
    const dayItems = r.items.filter((i) => i.day_of_week === lecture.day_of_week && i.block_type !== "deneme")
    expect(dayItems[0]).toBe(lecture)
  })

  it("aciliyeti yüksek hedef daha çok blok alır (kapasite sınırlıyken)", () => {
    const r = scheduleWeek({
      ...base,
      availability: { "1": WEEKDAY_EVENING },
      goals: [goal("acil", { son_tarih: "2026-10-22", remaining_questions: 300 }), goal("rahat", { son_tarih: "2027-01-30", remaining_questions: 300 })],
    })
    const n = (id: string) => r.items.filter((i) => i.assignment_id === id).length
    expect(n("acil")).toBeGreaterThan(n("rahat"))
  })

  it("mevcut saatli kalemlerin etrafına yerleştirir, geçmiş günleri atlar", () => {
    const r = scheduleWeek({
      ...base,
      today: "2026-10-21",
      fixed: [{ day_of_week: 3, start_time: "17:00", end_time: "19:00" }],
      goals: [goal("a", { remaining_questions: 400 })],
    })
    expect(r.items.some((i) => i.day_of_week < 3)).toBe(false)
    expect(r.items.filter((i) => i.day_of_week === 3).every((i) => i.start_time >= "19:00")).toBe(true)
  })

  it("tekrar bloğu vadesinden önce konmaz, 15-20 soru", () => {
    const r = scheduleWeek({
      ...base,
      reviews: [{ topic_id: "x", topic_name: "Üslü", subject_id: "s", subject_name: "Mat", due: "2026-10-22", reason: "aralikli" }],
    })
    const rev = r.items.find((i) => i.block_type === "tekrar")!
    expect(rev.day_of_week).toBeGreaterThanOrEqual(4)
    expect(rev.hedef_soru).toBeGreaterThanOrEqual(15)
    expect(rev.hedef_soru).toBeLessThanOrEqual(20)
  })

  it("yük çarpanı blok sayısını azaltır", () => {
    const goals = [goal("a", { remaining_questions: 1000, son_tarih: "2026-10-25" }), goal("b", { remaining_questions: 1000, son_tarih: "2026-10-25" })]
    const full = scheduleWeek({ ...base, goals })
    const low = scheduleWeek({ ...base, goals, loadFactor: 0.55 })
    expect(low.meta.blockCount).toBeLessThan(full.meta.blockCount)
  })
})
