import { describe, expect, it } from "vitest"
import {
  acyclicEdges,
  activeSlotsFor,
  blockTypeFor,
  buildRoadmap,
  fallbackTopicWeight,
  isGoalComplete,
  learningPhaseFor,
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
  it("aktif konu sayısı 4-6 arası", () => {
    expect(activeSlotsFor(200)).toBe(4)
    expect(activeSlotsFor(600)).toBe(5)
    expect(activeSlotsFor(5000)).toBe(6)
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

  it("ön koşul, puanı düşük olsa da önce; bağımlı konu ön koşul bitince başlar", () => {
    const r = buildRoadmap({
      ...base,
      topics: [topic("fonk", { effective: 60, weight: 1 }), topic("limit", { effective: 10, weight: 3 })],
      edges: [{ prereq: "fonk", topic: "limit" }],
    })
    const fonk = r.items.find((i) => i.topic_id === "fonk")!
    const limit = r.items.find((i) => i.topic_id === "limit")!
    expect(fonk.plan_order).toBeLessThan(limit.plan_order)
    expect(limit.start > fonk.end).toBe(true)
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

  it("aynı anda aynı dersten en fazla 2 aktif konu", () => {
    const topics = Array.from({ length: 10 }, (_, i) => topic(`m${i}`, { weight: 10 - i }))
    const r = buildRoadmap({ ...base, topics, edges: [] })
    expect(r.items.filter((i) => i.status === "aktif")).toHaveLength(2)
  })

  it("hedef tarihleri gerçekçi: aynı anda başlayanlar ihtiyaca göre farklı günlerde biter", () => {
    const topics = [
      topic("az", { subject_id: "a", effective: 80 }), // tekrar: 30 soru
      topic("orta", { subject_id: "b", effective: 60 }), // soru çözümü: 80 soru
      topic("cok", { subject_id: "c", effective: 10 }), // konu çalışması: 120 soru + anlatım
    ]
    const r = buildRoadmap({ ...base, topics, edges: [] })
    const end = (id: string) => r.items.find((i) => i.topic_id === id)!.end
    expect(new Set(r.items.map((i) => i.end)).size).toBe(3)
    expect(end("az") < end("orta") && end("orta") < end("cok")).toBe(true)
  })

  it("öğrenme aşamasında aynı anda en fazla 4 konu, toplam aktif ≤ 6", () => {
    const topics = Array.from({ length: 10 }, (_, i) => topic(`h${i}`, { subject_id: `s${i}`, effective: 10, assessment: "hic_gormedim", weight: 10 - i }))
    const r = buildRoadmap({ ...base, weeklyMinutes: 5000, topics, edges: [] })
    const active = r.items.filter((i) => i.status === "aktif")
    expect(active.length).toBeLessThanOrEqual(6)
    expect(active.filter((i) => i.learning_phase === "gerekli")).toHaveLength(4)
  })
})

describe("TYT → AYT kapısı", () => {
  const base = { today: TODAY, examDate: EXAM, weeklyMinutes: 1200, minutesPerQuestion: 1.5, existing: [], completedTopicIds: [] }
  const tyt = (id: string, over: Partial<RoadmapTopicInput> = {}) =>
    topic(id, { subject_id: "tytmat", subject_name: "TYT Matematik", weight: 1, ...over })
  const ayt = (id: string, over: Partial<RoadmapTopicInput> = {}) =>
    topic(id, { subject_id: "aytmat", subject_name: "AYT Matematik", weight: 5, effective: 10, assessment: "hic_gormedim", ...over })

  it("ön koşul zincirindeki TYT konusu bitmeden AYT konusu açılmaz", () => {
    const r = buildRoadmap({
      ...base,
      topics: [tyt("fonk", { topic_name: "Fonksiyonlar", effective: 50 }), ayt("turev"), ayt("limit")],
      edges: [{ prereq: "fonk", topic: "limit" }],
    })
    const fonk = r.items.find((i) => i.topic_id === "fonk")!
    const turev = r.items.find((i) => i.topic_id === "turev")!
    expect(turev.gate).toEqual(["fonk"])
    expect(turev.status).toBe("sirada")
    expect(turev.start > fonk.end).toBe(true)
    expect(turev.reasons).toContain("TYT Matematik temel konuları bitince açılır")
    expect(r.notes.some((n) => n.includes("AYT konuları"))).toBe(true)
  })

  it("kapı konusu ustalık ≥ 75 ise kapı açık", () => {
    const r = buildRoadmap({
      ...base,
      topics: [tyt("fonk", { effective: 80 }), ayt("turev")],
      edges: [{ prereq: "fonk", topic: "turev" }],
    })
    expect(r.items.find((i) => i.topic_id === "turev")!.status).toBe("aktif")
  })

  it("zincirde TYT konusu yoksa config'teki temel konu listesi kapıdır", () => {
    const r = buildRoadmap({
      ...base,
      topics: [tyt("polinom", { topic_name: "Polinomlar", effective: 30 }), tyt("olasilik", { topic_name: "Olasılık", effective: 30 }), ayt("turev")],
      edges: [],
    })
    expect(r.items.find((i) => i.topic_id === "turev")!.gate).toEqual(["polinom"])
  })

  it("sınava 26 hafta kala kapı kapalı olsa da AYT başlar", () => {
    // Kapı konusu çok uzun: TYT bitmeden 26 hafta sınırına gelinir.
    const r = buildRoadmap({
      ...base,
      weeklyMinutes: 100,
      // 6 kapı konusu, dersten aynı anda en çok 2 → TYT ~4 ay sürer.
      topics: [...Array.from({ length: 6 }, (_, i) => tyt(`f${i}`, { effective: 10, assessment: "hic_gormedim" })), ayt("turev")],
      edges: Array.from({ length: 6 }, (_, i) => ({ prereq: `f${i}`, topic: "turev" })),
    })
    const turev = r.items.find((i) => i.topic_id === "turev")!
    expect(r.aytForceStart).toBe("2026-12-19")
    expect(turev.start).toBe("2026-12-19")
    expect(r.items.filter((i) => i.topic_id.startsWith("f")).some((i) => i.end > turev.start)).toBe(true)
    expect(turev.reasons.some((x) => x.includes("26 hafta kaldığı için"))).toBe(true)
  })
})

describe("öğrenme aşaması ve yedek ağırlık", () => {
  it("hiç görmedim / zayıf → gerekli, eksik → opsiyonel, biliyorum → yok", () => {
    expect(learningPhaseFor("hic_gormedim", 60)).toBe("gerekli")
    expect(learningPhaseFor(null, 30)).toBe("gerekli")
    expect(learningPhaseFor("eksik", 45)).toBe("opsiyonel")
    expect(learningPhaseFor("biliyorum", 75)).toBe("yok")
  })
  it("sayısalda Fizik/Kimya konusu Biyoloji konusundan ağır; ders içi eşit", () => {
    const bio = fallbackTopicWeight(13, 0.6, 15)
    const fiz = fallbackTopicWeight(14, 1, 24)
    const kim = fallbackTopicWeight(13, 1, 17)
    expect(fiz).toBeGreaterThan(bio)
    expect(kim).toBeGreaterThan(bio)
  })
})

describe("paceStatus", () => {
  it("geçen sürenin gerisinde kalan hedef geride", () => {
    expect(paceStatus({ start: "2026-10-01", end: "2026-10-21", today: "2026-10-19", solved: 10, target: 100 })).toBe("geride")
    expect(paceStatus({ start: "2026-10-01", end: "2026-10-21", today: "2026-10-05", solved: 20, target: 100 })).toBe("zamaninda")
  })
})
