import { describe, expect, it } from "vitest"
import {
  fromHHMM,
  mergeVideoDays,
  scheduleWeek,
  slotsToIntervals,
  spacedReviewsDue,
  toHHMM,
  usableDays,
  weekRulesFor,
  type ProgramGoal,
  type ScheduleInput,
} from "@/lib/upplan/scheduler"
import { UPPLAN_TRACK_SQL_CONFIG as C } from "@/lib/upplan/config"

// Izgara 06:00'dan başlar, slot 30 dk → 17:00 = slot 22, 22:00 = slot 32.
const range = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => from + i)
const WEEKDAY_EVENING = range(22, 32) // 17:00–22:00
const WEEKEND_DAY = range(8, 24) // 10:00–18:00
const AVAIL = { "1": WEEKDAY_EVENING, "2": WEEKDAY_EVENING, "3": WEEKDAY_EVENING, "4": WEEKDAY_EVENING, "5": WEEKDAY_EVENING, "6": WEEKEND_DAY, "7": WEEKEND_DAY }
const mins = (i: { start_time: string; end_time: string }) => fromHHMM(i.end_time) - fromHHMM(i.start_time)

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
    priority: 1,
    ...over,
  }
}

// track yok → limitsiz, deneme var, iskelet yok (algoritmanın çekirdeği).
const RULES = weekRulesFor({ track: null, schoolDays: [], holiday: false, skeleton: [] })
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
  rules: RULES,
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
  it("20 dk altı video parçası aynı dersin sonraki video gününe birleşir", () => {
    const out = mergeVideoDays(
      [
        { day_of_week: 1, minutes: 10, subject_id: "tur", label: "A", topic_ids: ["x"] },
        { day_of_week: 2, minutes: 15, subject_id: "tur", label: "B", topic_ids: ["y"] },
        { day_of_week: 3, minutes: 40, subject_id: "mat", label: "M", topic_ids: [] },
      ],
      1,
    )
    const tur = out.filter((d) => d.subject_id === "tur")
    expect(tur).toHaveLength(1)
    expect(tur[0]).toMatchObject({ day_of_week: 2, minutes: 25 })
    expect(tur[0].topic_ids.sort()).toEqual(["x", "y"])
    expect(out.every((d) => d.minutes >= C.video_min_chunk_minutes)).toBe(true)
  })
})

describe("güvenlik limitleri", () => {
  it("9. sınıf: okul günü en fazla 2 saat, haftada bir tam boş gün", () => {
    const rules = weekRulesFor({ track: "maarif_9", schoolDays: [1, 2, 3, 4, 5], holiday: false, skeleton: [] })
    const days = usableDays({ ...base, rules })
    const total = (d: number) => (days.get(d) ?? []).reduce((n, [a, b]) => n + b - a, 0)
    for (const d of [1, 2, 3, 4, 5]) expect(total(d)).toBeLessThanOrEqual(C.limit_maarif_9_school_day_max_min)
    expect([1, 2, 3, 4, 5, 6, 7].filter((d) => total(d) === 0).length).toBeGreaterThanOrEqual(1)
    for (const d of [6, 7]) expect(total(d)).toBeLessThanOrEqual(C.limit_maarif_9_daily_max_min)
  })
  it("tatil haftasında okul günü sınırı kalkar ve yük artar", () => {
    const goals = [goal("a", { remaining_questions: 2000 }), goal("b", { remaining_questions: 2000 })]
    const school = scheduleWeek({ ...base, goals, loadFactor: 0.7, rules: weekRulesFor({ track: "maarif_10", schoolDays: [1, 2, 3, 4, 5], holiday: false, skeleton: [] }) })
    const holiday = scheduleWeek({ ...base, goals, loadFactor: 0.7, rules: weekRulesFor({ track: "maarif_10", schoolDays: [], holiday: true, skeleton: [] }) })
    expect(holiday.meta.studyMinutes).toBeGreaterThan(school.meta.studyMinutes * 1.25)
  })
})

describe("scheduleWeek", () => {
  it("deneme hafta sonu sabahı; ertesi gün deneme analizi", () => {
    const r = scheduleWeek(base)
    const exams = r.items.filter((i) => i.block_type === "deneme")
    expect(exams).toHaveLength(1)
    expect(exams[0]).toMatchObject({ day_of_week: 6, start_time: "10:00", end_time: "12:45" })
    const analysis = r.items.find((i) => i.baslik === "Deneme analizi + yanlış defteri")!
    expect(analysis.day_of_week).toBe(7)
    expect(mins(analysis)).toBe(C.exam_analysis_minutes)
  })

  it("günde aynı dersten en fazla 2 blok", () => {
    const r = scheduleWeek({ ...base, goals: [goal("a", { remaining_questions: 400 })] })
    const perDay = new Map<number, number>()
    for (const i of r.items.filter((x) => x.subject_id === "s-a")) perDay.set(i.day_of_week, (perDay.get(i.day_of_week) ?? 0) + 1)
    expect(Math.max(...perDay.values())).toBeLessThanOrEqual(2)
  })

  it("konu bloğu odak süresini aşmaz; 48 saat içinde aynı konunun soru bloğu gelir", () => {
    const r = scheduleWeek({ ...base, goals: [goal("b", { block_type: "konu_calisma", lecture_pending: true, remaining_questions: 120 })] })
    const lecture = r.items.find((i) => i.block_type === "konu_calisma")!
    expect(lecture.baslik).toBe("Konu çalışması: b")
    expect(mins(lecture)).toBeLessThanOrEqual(base.focusMinutes)
    const next = r.items.filter((i) => i.assignment_id === "b" && i.block_type === "soru_cozum")
    expect(next.some((i) => i.day_of_week - lecture.day_of_week <= C.konu_soru_max_gap_days && (i.day_of_week > lecture.day_of_week || i.start_time >= lecture.end_time))).toBe(true)
  })

  it("konu bitmeden o konunun soru bloğu konmaz", () => {
    const goals = Array.from({ length: 3 }, (_, i) => goal(`k${i}`, { lecture_pending: true, remaining_questions: 300, priority: 3 - i }))
    const r = scheduleWeek({ ...base, goals })
    const key = (i: { day_of_week: number; start_time: string }) => i.day_of_week * 10000 + fromHHMM(i.start_time)
    for (const g of goals) {
      const own = r.items.filter((i) => i.assignment_id === g.assignment_id).sort((x, y) => key(x) - key(y))
      if (!own.length) continue
      expect(own[0].block_type).toBe("konu_calisma")
      expect(own.slice(1).every((i) => i.block_type !== "konu_calisma" && key(i) >= own[0].day_of_week * 10000 + fromHHMM(own[0].end_time))).toBe(true)
    }
  })

  it("soru bloğu yerleşmiyorsa konu bloğu da konmaz", () => {
    // Tek gün, 60 dk: 45 dk konu + mola + 30 dk soru sığmaz.
    const r = scheduleWeek({ ...base, availability: { "1": range(22, 24) }, goals: [goal("x", { lecture_pending: true })] })
    expect(r.items.filter((i) => i.assignment_id === "x")).toHaveLength(0)
    expect(r.meta.unplaced).toBe(1)
  })

  it("haftada 1 deneme kuralı: hafta zaten deneme içeriyorsa yenisi eklenmez", () => {
    const r = scheduleWeek({ ...base, existingExams: 1 })
    expect(r.items.filter((i) => i.block_type === "deneme")).toHaveLength(0)
    expect(r.meta.examCount).toBe(1)
  })

  it("önceliği yüksek hedef daha çok süre alır (ders payı)", () => {
    const r = scheduleWeek({
      ...base,
      goals: [
        goal("yuksek", { priority: 3, remaining_questions: 600 }),
        goal("dusuk", { priority: 1, remaining_questions: 600 }),
        goal("orta", { priority: 2, remaining_questions: 600 }),
      ],
      loadFactor: 0.5,
    })
    const m = (s: string) => r.meta.subjectMinutes[s] ?? 0
    expect(m("s-yuksek")).toBeGreaterThan(m("s-dusuk"))
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

  it("tekrar bloğu vadesinden önce konmaz ve kısa (≤ 30 dk)", () => {
    const r = scheduleWeek({
      ...base,
      reviews: [{ topic_id: "x", topic_name: "Üslü", subject_id: "s", subject_name: "Mat", due: "2026-10-22", reason: "aralikli" }],
    })
    const rev = r.items.find((i) => i.baslik === "Tekrar: Üslü")!
    expect(rev.day_of_week).toBeGreaterThanOrEqual(4)
    expect(mins(rev)).toBeLessThanOrEqual(30)
  })

  it("yük çarpanı çalışma süresini azaltır", () => {
    const goals = ["a", "b", "c", "d", "e"].map((id) => goal(id, { remaining_questions: 1000 }))
    const full = scheduleWeek({ ...base, goals })
    const low = scheduleWeek({ ...base, goals, loadFactor: 0.55 })
    expect(low.meta.studyMinutes).toBeLessThan(full.meta.studyMinutes)
  })

  it("günlük iskelet her müsait güne yerleşir, sürekli pratik konuları dönüşümlü", () => {
    const rules = weekRulesFor({
      track: "mezun",
      schoolDays: [],
      holiday: false,
      skeleton: [
        {
          key: "paragraf",
          label: "Paragraf soruları",
          subject_id: "tur",
          minutes: 20,
          days: [1, 2, 3, 4, 5, 6, 7],
          topics: [
            { assignment_id: "p1", topic_id: "par", topic_name: "Paragraf" },
            { assignment_id: "p2", topic_id: "cum", topic_name: "Cümlede Anlam" },
          ],
          block_type: "soru_cozum",
          neden: "Her gün paragraf",
        },
      ],
    })
    const r = scheduleWeek({ ...base, rules, goals: [goal("acil", { remaining_questions: 1000 })] })
    const p = r.items.filter((i) => i.subject_id === "tur")
    expect(new Set(p.map((i) => i.day_of_week)).size).toBeGreaterThanOrEqual(6)
    expect(p.every((i) => mins(i) === 20 && i.hedef_soru === Math.round(20 / 1.5))).toBe(true)
    expect(new Set(p.map((i) => i.topic_id))).toEqual(new Set(["par", "cum"]))
  })

  it("her blokta 'neden' gerekçesi var", () => {
    const r = scheduleWeek({ ...base, goals: [goal("a", { reason: "Saat başına yaklaşık 3 puan" })] })
    expect(r.items.length).toBeGreaterThan(0)
    expect(r.items.every((i) => !!i.neden && i.neden.length > 5)).toBe(true)
  })
})

describe("playlist video günleri", () => {
  const sumByDay = (items: { day_of_week: number; start_time: string; end_time: string; block_type: string }[], d: number) =>
    items.filter((i) => i.day_of_week === d && i.block_type !== "deneme").reduce((s, i) => s + mins(i), 0)

  it("video bloğu konu yerine geçer; arkasından 48 saat içinde soru; müsaitlik aşılmaz", () => {
    const r = scheduleWeek({
      ...base,
      focusMinutes: 60,
      goals: [goal("a", { lecture_pending: true, topic_id: "t-video", priority: 2 }), goal("b", { lecture_pending: true })],
      videoDays: [{ day_of_week: 1, minutes: 52, subject_id: "s-a", label: "Kamp (2 video)", topic_ids: ["t-video"] }],
    })
    const video = r.items.find((i) => i.baslik.startsWith("Video:"))!
    // Video günün sonuna yerleşir (ağır bloklar sabaha); süresi 52 → 55 dk.
    expect(video).toMatchObject({ day_of_week: 1, block_type: "konu_calisma", topic_id: "t-video" })
    expect(mins(video)).toBe(55)
    expect(r.meta.videoMinutes).toBe(55)
    expect(r.items.some((i) => i.baslik === "Konu çalışması: a")).toBe(false)
    expect(r.items.some((i) => i.baslik === "Konu çalışması: b")).toBe(true)
    const after = r.items.filter((x) => x.assignment_id === "a" && x.block_type === "soru_cozum")
    expect(after.length).toBeGreaterThan(0)
    expect(after.some((i) => i.day_of_week - 1 <= C.konu_soru_max_gap_days)).toBe(true)
    for (const i of after) expect(i.day_of_week > 1 || fromHHMM(i.start_time) >= fromHHMM(video.end_time)).toBe(true)
    expect(sumByDay(r.items, 1)).toBeLessThanOrEqual(5 * 60)
  })

  it("uzun video tek blokta odak süresine kesilir, taşan dakika raporlanır", () => {
    const r = scheduleWeek({ ...base, videoDays: [{ day_of_week: 2, minutes: 400, subject_id: "s-a", label: "Uzun", topic_ids: [] }] })
    const videos = r.items.filter((i) => i.baslik.startsWith("Video:"))
    expect(videos).toHaveLength(1)
    expect(mins(videos[0])).toBeLessThanOrEqual(base.focusMinutes)
    expect(r.meta.videoMinutes + r.meta.videoOverflowMinutes).toBe(400)
  })

  it("bugünden önceki günün videoları programa konmaz, taşma sayılmaz", () => {
    const r = scheduleWeek({ ...base, today: "2026-10-21", videoDays: [{ day_of_week: 1, minutes: 90, subject_id: "s-a", label: "Dün", topic_ids: [] }] })
    expect(r.items.some((i) => i.baslik.startsWith("Video:"))).toBe(false)
    expect(r.meta.videoOverflowMinutes).toBe(0)
  })
})
