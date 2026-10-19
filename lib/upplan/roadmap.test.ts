import { describe, expect, it } from "vitest"
import {
  acyclicEdges,
  activeSlotsFor,
  blockTypeFor,
  buildRoadmap,
  isGoalComplete,
  minutesPerQuestion,
  netGapFactor,
  paceStatus,
  practiceExamsPerWeek,
  prereqViolations,
  priorityScore,
  topicEdgesFromAtoms,
  weeklyCapacityMinutes,
  type RoadmapTopicInput,
} from "@/lib/upplan/roadmap"

const TODAY = "2026-10-19"
const EXAM = "2027-06-19"

function topic(id: string, over: Partial<RoadmapTopicInput> = {}): RoadmapTopicInput {
  return {
    topic_id: id,
    topic_name: id.toUpperCase(),
    subject_id: "mat",
    subject_name: "AYT Matematik",
    weight: 2,
    weightEstimated: true,
    effective: 40,
    assessment: null,
    examWrongs: 0,
    netGap: 1,
    gapAtom: null,
    ...over,
  }
}

describe("puan ve hedef şablonu", () => {
  it("puan = ağırlık × (100−ustalık)/100 × net açığı × açık çarpanı", () => {
    expect(priorityScore({ weight: 2, effective: 40, netGap: 1, hasConfidentGap: false })).toBe(1.2)
    expect(priorityScore({ weight: 2, effective: 40, netGap: 1.5, hasConfidentGap: true })).toBe(2.25)
  })
  it("şablon: <40 konu çalışması, 40-75 soru çözümü, 75+ tekrar", () => {
    expect(blockTypeFor(10)).toBe("konu_calisma")
    expect(blockTypeFor(40)).toBe("soru_cozum")
    expect(blockTypeFor(75)).toBe("tekrar")
  })
  it("tamamlanma: soru doldu VE ustalık ≥ 75", () => {
    expect(isGoalComplete(120, 120, 74)).toBe(false)
    expect(isGoalComplete(119, 120, 90)).toBe(false)
    expect(isGoalComplete(120, 120, 75)).toBe(true)
  })
  it("net açığı: deneme yoksa 1, kayıp arttıkça büyür", () => {
    expect(netGapFactor([])).toBe(1)
    expect(netGapFactor([{ correct: 20, wrong: 0, empty: 0 }])).toBe(1)
    expect(netGapFactor([{ correct: 10, wrong: 8, empty: 2 }])).toBe(1.6)
  })
  it("soru başı süre: yetersiz süreli kayıtta varsayılan 1.5", () => {
    expect(minutesPerQuestion([{ total_questions: 20, duration_minutes: 60 }])).toBe(1.5)
    expect(minutesPerQuestion([{ total_questions: 50, duration_minutes: 100 }])).toBe(2)
  })
})

describe("kapasite", () => {
  it("haftalık kapasite müsait süreden deneme süresini düşer", () => {
    // 20 saat müsait, 1 TYT denemesi (165 dk), %85 kullanım
    expect(weeklyCapacityMinutes({ availableMinutes: 1200, segment: "yks", weeksLeft: 30, loadFactor: 1 })).toBe(880)
  })
  it("deneme sıklığı: >12 hafta 1, 6-12 hafta 2, son 6 hafta 3", () => {
    expect(practiceExamsPerWeek(30)).toBe(1)
    expect(practiceExamsPerWeek(8)).toBe(2)
    expect(practiceExamsPerWeek(3)).toBe(3)
  })
  it("aktif konu sayısı 4-8 arası", () => {
    expect(activeSlotsFor(200)).toBe(4)
    expect(activeSlotsFor(720)).toBe(6)
    expect(activeSlotsFor(5000)).toBe(8)
  })
})

describe("ön koşul grafı", () => {
  it("atom ön koşulundan konu ön koşulu türetir", () => {
    const topicOfAtom = new Map([
      ["a1", "fonk"],
      ["a2", "limit"],
      ["a3", "limit"],
    ])
    expect(
      topicEdgesFromAtoms(
        [
          { atom_id: "a2", prerequisite_atom_id: "a1" },
          { atom_id: "a3", prerequisite_atom_id: "a1" },
          { atom_id: "a3", prerequisite_atom_id: "a2" },
        ],
        topicOfAtom,
      ),
    ).toEqual([{ prereq: "fonk", topic: "limit" }])
  })
  it("döngüyü kırar ve raporlar", () => {
    const r = acyclicEdges(
      [
        { prereq: "a", topic: "b" },
        { prereq: "b", topic: "a" },
      ],
      new Set(["a", "b"]),
    )
    expect(r.edges).toHaveLength(1)
    expect(r.broken).toHaveLength(1)
  })
  it("sıralamada ön koşulu sonra gelen konuyu bulur", () => {
    expect(prereqViolations(["limit", "fonk"], [{ prereq: "fonk", topic: "limit" }])).toHaveLength(1)
    expect(prereqViolations(["fonk", "limit"], [{ prereq: "fonk", topic: "limit" }])).toHaveLength(0)
  })
})

describe("buildRoadmap", () => {
  const base = { today: TODAY, examDate: EXAM, weeklyMinutes: 900, minutesPerQuestion: 1.5, existing: [], completedTopicIds: [] }

  it("ön koşul, puanı düşük olsa da bağımlı konudan önceki dalgada", () => {
    const r = buildRoadmap({
      ...base,
      topics: [topic("fonk", { effective: 80, weight: 1 }), topic("limit", { effective: 10, weight: 3 })],
      edges: [{ prereq: "fonk", topic: "limit" }],
    })
    const fonk = r.items.find((i) => i.topic_id === "fonk")!
    const limit = r.items.find((i) => i.topic_id === "limit")!
    expect(fonk.plan_order).toBeLessThan(limit.plan_order)
    expect(fonk.wave).toBeLessThan(limit.wave)
    expect(fonk.reasons[0]).toBe("FONK önce, çünkü LIMIT konusunun ön koşulu")
  })

  it("mevcut aktif hedefler bozulmaz, kaynağıyla ilk dalgada", () => {
    const r = buildRoadmap({
      ...base,
      topics: [topic("a"), topic("b")],
      existing: [{ assignment_id: "x", topic_id: "b", source: "coach", remainingMinutes: 60, son_tarih: "2026-11-01" }],
      edges: [],
    })
    const b = r.items.find((i) => i.topic_id === "b")!
    expect(b.existing).toEqual({ assignment_id: "x", source: "coach" })
    expect(b.status).toBe("aktif")
    expect(b.reasons[0]).toBe("Koçundan devralınan hedef")
  })

  it("kapasite yetmezse düşük puanlılar zaman kalırsa + açık mesaj", () => {
    const topics = Array.from({ length: 60 }, (_, i) => topic(`t${i}`, { effective: 10, weight: 60 - i }))
    const r = buildRoadmap({ ...base, weeklyMinutes: 240, topics, edges: [] })
    expect(r.overflow?.count).toBeGreaterThan(0)
    expect(r.overflow?.message).toContain("konuya yetişemiyorsun")
    const last = r.items[r.items.length - 1]
    expect(last.status).toBe("zaman_kalirsa")
    // En yüksek puanlı ilk dalgada aktif
    expect(r.items[0].topic_id).toBe("t0")
    expect(r.items[0].status).toBe("aktif")
  })

  it("son 6 hafta deneme dönemi: yeni konu açılmaz", () => {
    const r = buildRoadmap({ ...base, today: "2027-05-20", topics: [topic("a")], edges: [] })
    expect(r.items[0].status).toBe("zaman_kalirsa")
    expect(r.notes.some((n) => n.includes("Deneme dönemi"))).toBe(true)
  })

  it("açıklamalar: net açığı ve fazla iyi değerlendirme", () => {
    const r = buildRoadmap({
      ...base,
      topics: [topic("prob", { topic_name: "Problemler", subject_name: "TYT Matematik", examWrongs: 3, assessment: "biliyorum" })],
      edges: [],
    })
    expect(r.items[0].reasons).toContain("Denemende TYT Matematik dersinde en çok net Problemler konusunda gitti")
    expect(r.items[0].reasons).toContain("Biliyorum demiştin ama denemede 3 yanlış çıktı")
  })

  it("hepsi iyi olan öğrenci: tekrar hedefleri, aktif konu sayısı sınırı", () => {
    const topics = Array.from({ length: 12 }, (_, i) => topic(`g${i}`, { effective: 85, subject_id: `s${i % 6}` }))
    const r = buildRoadmap({ ...base, topics, edges: [] })
    expect(r.items.every((i) => i.block_type === "tekrar" && i.target_questions === 30)).toBe(true)
    expect(r.items.filter((i) => i.status === "aktif")).toHaveLength(r.activeSlots)
  })

  it("bir dalgada aynı dersten en fazla 2 konu", () => {
    const topics = Array.from({ length: 10 }, (_, i) => topic(`m${i}`, { weight: 10 - i }))
    const r = buildRoadmap({ ...base, topics, edges: [] })
    expect(r.items.filter((i) => i.wave === 1)).toHaveLength(2)
  })
})

describe("paceStatus", () => {
  it("geçen sürenin gerisinde kalan hedef geride", () => {
    expect(paceStatus({ start: "2026-10-01", end: "2026-10-21", today: "2026-10-19", solved: 10, target: 100 })).toBe("geride")
    expect(paceStatus({ start: "2026-10-01", end: "2026-10-21", today: "2026-10-05", solved: 20, target: 100 })).toBe("zamaninda")
  })
})
