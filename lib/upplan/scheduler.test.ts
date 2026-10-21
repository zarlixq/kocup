import { describe, expect, it } from "vitest"
import { fromHHMM, scheduleWeek, slotsToIntervals, spacedReviewsDue, toHHMM, type ProgramGoal, type ScheduleInput } from "@/lib/upplan/scheduler"

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

  it("konu çalışması günün ilk bloğuna, en az 90 dk (45 dk odakta 2 blok arka arkaya)", () => {
    const r = scheduleWeek({
      ...base,
      goals: [goal("a"), goal("b", { block_type: "konu_calisma", lecture_pending: true, remaining_questions: 120 })],
    })
    const lecture = r.items.find((i) => i.block_type === "konu_calisma")!
    expect(lecture.assignment_id).toBe("b")
    expect(lecture.baslik).toBe("Konu çalışması: b")
    expect(fromHHMM(lecture.end_time) - fromHHMM(lecture.start_time)).toBeGreaterThanOrEqual(90)
    const dayItems = r.items.filter((i) => i.day_of_week === lecture.day_of_week && i.block_type !== "deneme")
    expect(dayItems[0]).toBe(lecture)
  })

  it("konu çalışması bitmeden o konunun soru bloğu konmaz (haftadaki ilk blok konu çalışması)", () => {
    const goals = Array.from({ length: 5 }, (_, i) =>
      goal(`k${i}`, { block_type: "konu_calisma", lecture_pending: true, remaining_questions: 300, son_tarih: "2026-10-30" }),
    )
    const r = scheduleWeek({ ...base, goals })
    const key = (i: { day_of_week: number; start_time: string }) => i.day_of_week * 10000 + fromHHMM(i.start_time)
    for (const g of goals) {
      const own = r.items.filter((i) => i.assignment_id === g.assignment_id).sort((x, y) => key(x) - key(y))
      expect(own.length).toBeGreaterThan(1)
      expect(own[0].block_type).toBe("konu_calisma")
      expect(own.slice(1).every((i) => i.block_type === "soru_cozum")).toBe(true)
      const le = own[0]
      expect(own.slice(1).every((i) => key(i) >= le.day_of_week * 10000 + fromHHMM(le.end_time))).toBe(true)
    }
  })

  it("konu çalışması yerleşemezse o konuya soru bloğu da konmaz", () => {
    // Tek gün, tek 45 dk'lık boşluk: 90 dk'lık konu çalışması sığmaz.
    const r = scheduleWeek({ ...base, availability: { "1": range(22, 24) }, goals: [goal("x", { lecture_pending: true })] })
    expect(r.items.filter((i) => i.assignment_id === "x")).toHaveLength(0)
    expect(r.meta.unplaced).toBe(1)
  })

  it("haftada 1 deneme kuralı: hafta zaten deneme içeriyorsa yenisi eklenmez, sayaç tutarlı", () => {
    const r = scheduleWeek({ ...base, existingExams: 1 })
    expect(r.items.filter((i) => i.block_type === "deneme")).toHaveLength(0)
    expect(r.meta.examCount).toBe(1)
    // Her hafta (sınava 13+ hafta) tam 1 deneme.
    for (const weeksLeft of [34, 20, 13]) {
      expect(scheduleWeek({ ...base, weeksLeft }).items.filter((i) => i.block_type === "deneme")).toHaveLength(1)
    }
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

  it("az acil dersi haftanın başında da yerleştirir; ders sınırı yüzünden blok dışarıda kalmaz", () => {
    // Uçtan uca testte görülen durum: acil dersler hafta başını doldurunca az acil
    // ders hafta sonuna yığılıyor, günde 2 blok sınırına takılıp sığmıyordu.
    const sub = (s: string, id: string, son: string) => goal(id, { subject_id: s, son_tarih: son, remaining_questions: 600 })
    const r = scheduleWeek({
      ...base,
      availability: { ...AVAIL, "6": range(8, 20), "7": range(8, 20) },
      goals: [
        sub("mat", "m1", "2026-10-24"), sub("mat", "m2", "2026-10-25"),
        sub("geo", "g1", "2026-10-24"), sub("geo", "g2", "2026-10-25"),
        sub("tur", "t1", "2026-11-20"), sub("tur", "t2", "2026-11-30"),
        sub("bio", "b1", "2026-12-20"), sub("bio", "b2", "2026-12-30"),
      ],
    })
    expect(r.meta.unplaced).toBe(0)
    expect(r.meta.blockCount).toBe(r.meta.capacityBlocks)
  })

  it("yük çarpanı blok sayısını azaltır", () => {
    const goals = [goal("a", { remaining_questions: 1000, son_tarih: "2026-10-25" }), goal("b", { remaining_questions: 1000, son_tarih: "2026-10-25" })]
    const full = scheduleWeek({ ...base, goals })
    const low = scheduleWeek({ ...base, goals, loadFactor: 0.55 })
    expect(low.meta.blockCount).toBeLessThan(full.meta.blockCount)
  })

  it("sürekli pratik her hafta blok alır: kapasite dar ve hedefler acil olsa da, farklı günlere", () => {
    const practice = [
      {
        key: "paragraf",
        label: "Paragraf",
        subject_id: "tur",
        blocks: 3,
        questionsPerBlock: 20,
        topics: [{ assignment_id: "p1", topic_id: "par", topic_name: "Paragraf" }],
      },
    ]
    const goals = [goal("acil", { remaining_questions: 1000, son_tarih: "2026-10-21" })]
    for (const weekStart of ["2026-10-19", "2026-10-26", "2026-11-02"]) {
      const r = scheduleWeek({ ...base, weekStart, today: weekStart, availability: { "1": range(22, 26), "3": range(22, 26), "5": range(22, 26) }, goals, practice })
      const p = r.items.filter((i) => i.assignment_id === "p1")
      expect(p).toHaveLength(3)
      expect(new Set(p.map((i) => i.day_of_week)).size).toBe(3)
      expect(p.every((i) => i.hedef_soru === 20 && i.baslik === "Pratik (Paragraf): Paragraf")).toBe(true)
    }
  })
})

describe("playlist video günleri", () => {
  const sumByDay = (items: { day_of_week: number; start_time: string; end_time: string; block_type: string }[], d: number) =>
    items
      .filter((i) => i.day_of_week === d && i.block_type !== "deneme")
      .reduce((s, i) => s + fromHHMM(i.end_time) - fromHHMM(i.start_time), 0)

  it("video süresi günün konu çalışmasına sayılır: ayrı blok, müsaitlik aşılmaz, eşlenen konuya ayrı konu çalışması yok", () => {
    const r = scheduleWeek({
      ...base,
      goals: [goal("a", { lecture_pending: true, topic_id: "t-video" }), goal("b", { lecture_pending: true })],
      videoDays: [{ day_of_week: 1, minutes: 52, subject_id: "s-a", label: "Kamp (2 video)", topic_ids: ["t-video"] }],
    })
    const video = r.items.find((i) => i.baslik.startsWith("Video:"))
    expect(video).toMatchObject({ day_of_week: 1, start_time: "17:00", end_time: "17:55", block_type: "konu_calisma", topic_id: "t-video" })
    expect(r.meta.videoMinutes).toBe(55)
    expect(r.meta.videoOverflowMinutes).toBe(0)
    // a konusu videoyla çalışılıyor → "Konu çalışması: a" yok; b'nin var.
    expect(r.items.some((i) => i.baslik === "Konu çalışması: a")).toBe(false)
    expect(r.items.some((i) => i.baslik === "Konu çalışması: b")).toBe(true)
    // a'nın soru blokları videonun bittiği andan sonra.
    for (const i of r.items.filter((x) => x.assignment_id === "a")) {
      expect(i.day_of_week > 1 || fromHHMM(i.start_time) >= fromHHMM("17:55")).toBe(true)
    }
    // Pazartesi toplam blok süresi müsaitliği (5 saat) aşmaz.
    expect(sumByDay(r.items, 1)).toBeLessThanOrEqual(5 * 60)
  })

  it("müsaitlikten uzun video kesilir, taşan dakika raporlanır", () => {
    const r = scheduleWeek({
      ...base,
      videoDays: [{ day_of_week: 2, minutes: 400, subject_id: "s-a", label: "Uzun", topic_ids: [] }],
    })
    expect(r.meta.videoMinutes).toBe(300)
    expect(r.meta.videoOverflowMinutes).toBe(100)
    expect(sumByDay(r.items, 2)).toBe(300)
  })
})

describe("playlist video günleri — geçmiş gün", () => {
  it("bugünden önceki günün videoları programa konmaz, taşma sayılmaz", () => {
    const r = scheduleWeek({
      ...base,
      today: "2026-10-21",
      videoDays: [{ day_of_week: 1, minutes: 90, subject_id: "s-a", label: "Dün", topic_ids: [] }],
    })
    expect(r.items.some((i) => i.baslik.startsWith("Video:"))).toBe(false)
    expect(r.meta.videoOverflowMinutes).toBe(0)
  })
})
