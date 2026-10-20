import { describe, expect, it } from "vitest"
import {
  acyclicEdges,
  activeSlotsFor,
  blockTypeFor,
  buildRoadmap,
  subjectFloors,
  subjectScoreWeight,
  topicWeightFromRow,
  topicSizeFactor,
  efficiencyScore,
  hoursNeeded,
  subjectCoefficient,
  isGoalComplete,
  learningPhaseFor,
  minutesPerQuestion,
  netGapFactor,
  paceStatus,
  practiceExamsPerWeek,
  prereqViolations,
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
  it("verimlilik = soru × katsayı × (90−ustalık)/100 × net açığı × açık çarpanı / saat", () => {
    // 2 × 2.89 × 0.5 / 5 = 0.578
    expect(efficiencyScore({ weight: 2, coefficient: 2.89, effective: 40, netGap: 1, hasConfidentGap: false, hours: 5 })).toBe(0.578)
    // × 1.5 × 1.25
    expect(efficiencyScore({ weight: 2, coefficient: 2.89, effective: 40, netGap: 1.5, hasConfidentGap: true, hours: 5 })).toBe(1.084)
    // hedefin üstünde: kazanılabilir pay 0
    expect(efficiencyScore({ weight: 2, coefficient: 2.89, effective: 95, netGap: 1, hasConfidentGap: false, hours: 1 })).toBe(0)
  })
  it("saat: hiç görmedim 5, eksik 3, biliyorum 1; yavaş öğrencide ölçeklenir", () => {
    expect(hoursNeeded("hic_gormedim", 10)).toBe(5)
    expect(hoursNeeded("eksik", 45)).toBe(3)
    expect(hoursNeeded(null, 80)).toBe(1)
    expect(hoursNeeded("eksik", 45, 3)).toBe(6)
  })
  it("katsayı puan türüne göre; puana girmeyen ders 0; iki teste bölünen ders soru ağırlıklı", () => {
    expect(subjectCoefficient("SAY", "AYT Fizik")).toBe(2.46)
    expect(subjectCoefficient("SAY", "TYT Geometri")).toBe(1.39)
    expect(subjectCoefficient("EA", "AYT Fizik")).toBe(0)
    // EA: Tarih-1 (10 soru × 2.53) + Tarih-2 (11 soru, EA'da yok) → 25.3 / 21
    expect(subjectCoefficient("EA", "AYT Tarih")).toBe(1.205)
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
    expect(fonk.reasons[1]).toBe("FONK önce, çünkü LIMIT konusunun ön koşulu")
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
    expect(b.reasons[1]).toBe("Koçundan devralınan hedef")
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

  it("ön koşul (atom) verisi yoksa kapı TYT dersinin TÜM konuları", () => {
    const r = buildRoadmap({
      ...base,
      topics: [tyt("polinom", { topic_name: "Polinomlar", effective: 30 }), tyt("olasilik", { topic_name: "Olasılık", effective: 30 }), ayt("turev")],
      edges: [],
    })
    expect(r.items.find((i) => i.topic_id === "turev")!.gate).toEqual(["polinom", "olasilik"])
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
})

describe("paceStatus", () => {
  it("geçen sürenin gerisinde kalan hedef geride", () => {
    expect(paceStatus({ start: "2026-10-01", end: "2026-10-21", today: "2026-10-19", solved: 10, target: 100 })).toBe("geride")
    expect(paceStatus({ start: "2026-10-01", end: "2026-10-21", today: "2026-10-05", solved: 20, target: 100 })).toBe("zamaninda")
  })
})

describe("saat başına puan sıralaması", () => {
  const base = { today: TODAY, examDate: EXAM, weeklyMinutes: 900, minutesPerQuestion: 1.5, existing: [], completedTopicIds: [], edges: [] }

  it("katsayısı ve soru sayısı yüksek konu önce", () => {
    const r = buildRoadmap({
      ...base,
      topics: [
        topic("az", { subject_id: "tytfen", subject_name: "TYT Fizik", weight: 0.6, coefficient: 1.07 }),
        topic("cok", { subject_id: "aytmat", subject_name: "AYT Matematik", weight: 2, coefficient: 2.89 }),
      ],
    })
    expect(r.items[0].topic_id).toBe("cok")
    expect(r.items[0].reasons[0]).toMatch(/^Saat başına yaklaşık [\d,]+ puan: sınavda yaklaşık 2 soru çıkıyor ve/)
  })

  it("aynı katsayı ve soruda kısa (az saat) konu uzun konudan önce", () => {
    const r = buildRoadmap({
      ...base,
      topics: [topic("uzun", { subject_id: "a", hours: 5 }), topic("kisa", { subject_id: "b", hours: 2 })],
    })
    expect(r.items.map((i) => i.topic_id)).toEqual(["kisa", "uzun"])
    expect(r.items[0].efficiency!).toBeGreaterThan(r.items[1].efficiency!)
  })

  it("ön koşul, bağlı konunun verimliliğini devralır; kapı kuralı bozulmaz", () => {
    const r = buildRoadmap({
      ...base,
      topics: [
        topic("onkosul", { subject_id: "tytmat", subject_name: "TYT Matematik", weight: 0.5, effective: 50, coefficient: 1.39 }),
        topic("bagli", { subject_id: "tytmat", subject_name: "TYT Matematik", weight: 3, effective: 10, coefficient: 1.39 }),
        // AYT konusunun atom verisi var → kapı yalnız ön koşul zincirindeki TYT konuları.
        topic("ayt", { subject_id: "aytmat", subject_name: "AYT Matematik", weight: 5, effective: 10, coefficient: 2.89, atomCount: 8 }),
      ],
      edges: [
        { prereq: "onkosul", topic: "bagli" },
        { prereq: "onkosul", topic: "ayt" },
      ],
    })
    const pos = (id: string) => r.items.find((i) => i.topic_id === id)!.plan_order
    expect(pos("onkosul")).toBeLessThan(pos("bagli"))
    const ayt = r.items.find((i) => i.topic_id === "ayt")!
    expect(ayt.gate).toEqual(["onkosul"])
    expect(ayt.status).toBe("sirada")
  })

  it("kapasite yetmezse en düşük verimliler zaman kalırsa", () => {
    const topics = Array.from({ length: 40 }, (_, i) => topic(`t${i}`, { subject_id: `s${i % 8}`, effective: 10, weight: 40 - i }))
    const r = buildRoadmap({ ...base, weeklyMinutes: 240, topics })
    const z = r.items.filter((i) => i.status === "zaman_kalirsa")
    const planned = r.items.filter((i) => i.status !== "zaman_kalirsa")
    expect(z.length).toBeGreaterThan(0)
    expect(Math.max(...z.map((i) => i.efficiency!))).toBeLessThanOrEqual(Math.min(...planned.map((i) => i.efficiency!)))
  })

  it("sürekli pratik konusu: hep aktif, aktif konu sınırına sayılmaz, ders saatine eklenir", () => {
    const topics = [
      topic("paragraf", { subject_id: "tur", subject_name: "TYT Türkçe", topic_name: "Paragraf", effective: 50 }),
      ...Array.from({ length: 10 }, (_, i) => topic(`m${i}`, { subject_id: `x${i}`, weight: 10 - i })),
    ]
    const r = buildRoadmap({ ...base, topics })
    const p = r.items.find((i) => i.topic_id === "paragraf")!
    expect(p.practice).toBe(true)
    expect(p.status).toBe("aktif")
    expect(p.end).toBe(EXAM)
    expect(r.items.filter((i) => i.status === "aktif" && !i.practice)).toHaveLength(r.activeSlots)
    expect(r.subjectHours?.find((h) => h.subject_name === "TYT Türkçe")!.hours).toBeGreaterThan(0)
  })
})

describe("ön koşul verisi olmayan ders ve konu büyüklüğü", () => {
  const base = { today: TODAY, examDate: EXAM, weeklyMinutes: 600, minutesPerQuestion: 1.5, existing: [], completedTopicIds: [], edges: [] }
  const tytBio = (id: string) => topic(id, { subject_id: "tytbio", subject_name: "TYT Biyoloji", weight: 0.43, coefficient: 1.07, effective: 45, assessment: "eksik" })
  const aytBio = (id: string) => topic(id, { subject_id: "aytbio", subject_name: "AYT Biyoloji", weight: 0.87, coefficient: 2.61, effective: 10, assessment: "hic_gormedim" })

  it("ön koşul verisi yokken AYT, TYT dersinin tüm konuları bitmeden açılmaz; TYT konuları AYT'nin verimliliğini devralır", () => {
    // Dolgu konuları TYT Biyoloji'den verimli, AYT Biyoloji'den verimsiz.
    const filler = Array.from({ length: 12 }, (_, i) => topic(`f${i}`, { subject_id: `x${i}`, weight: 1, coefficient: 1 }))
    const r = buildRoadmap({ ...base, topics: [tytBio("b1"), tytBio("b2"), tytBio("b3"), aytBio("a1"), ...filler] })
    const tyt = r.items.filter((i) => i.subject_name === "TYT Biyoloji")
    const ayt = r.items.find((i) => i.topic_id === "a1")!
    expect(ayt.gate!.sort()).toEqual(["b1", "b2", "b3"])
    expect(ayt.start > tyt.map((i) => i.end).sort().at(-1)!).toBe(true)
    // Az ağırlıklı TYT Biyoloji konuları, AYT'nin kapısı oldukları için öne çekilir (ilk gün aktif).
    expect(tyt.filter((i) => i.status === "aktif")).toHaveLength(2)
    expect(tyt[0].efficiency!).toBeLessThan(r.items.find((i) => i.topic_id === "f0")!.efficiency!)
  })

  it("plana giren AYT dersinin TYT konusu kapasite yetmese de zaman kalırsa'ya düşmez; plana hiç giremeyen AYT dersi TYT'yi korumaz", () => {
    // Dolgular AYT Biyoloji'den verimsiz → AYT Biyoloji plana girer, TYT Biyoloji korunur.
    const filler = Array.from({ length: 60 }, (_, i) => topic(`f${i}`, { subject_id: `x${i % 10}`, weight: 1, coefficient: 1 }))
    const r = buildRoadmap({ ...base, weeklyMinutes: 200, topics: [tytBio("b1"), tytBio("b2"), aytBio("a1"), ...filler] })
    expect(r.items.filter((i) => i.status === "zaman_kalirsa").length).toBeGreaterThan(0)
    expect(r.items.find((i) => i.topic_id === "a1")!.status).not.toBe("zaman_kalirsa")
    expect(r.items.filter((i) => i.subject_name === "TYT Biyoloji").every((i) => i.status !== "zaman_kalirsa" && i.gate_for === "AYT Biyoloji")).toBe(true)
    // Dolgular çok verimli → AYT Biyoloji sığmaz, TYT Biyoloji de kendi verimliliğiyle düşer.
    const strong = Array.from({ length: 60 }, (_, i) => topic(`s${i}`, { subject_id: `x${i % 10}`, weight: 3, coefficient: 1.2 }))
    const r2 = buildRoadmap({ ...base, weeklyMinutes: 200, topics: [tytBio("b1"), tytBio("b2"), aytBio("a1"), ...strong] })
    expect(r2.items.find((i) => i.topic_id === "a1")!.status).toBe("zaman_kalirsa")
    expect(r2.items.filter((i) => i.subject_name === "TYT Biyoloji").every((i) => i.status === "zaman_kalirsa")).toBe(true)
  })

  it("küçük konu az soru getirse de kısa sürdüğü için büyük konuyla yarışır", () => {
    // TYT Din (0,56 soru, katsayı 1,27, küçük) ↔ TYT Fizik (0,58 soru, katsayı 1,07, büyük)
    const din = topic("din", { subject_id: "din", subject_name: "TYT Din Kültürü", weight: 0.56, coefficient: 1.27, effective: 45, assessment: "eksik", sizeFactor: topicSizeFactor({ subjectName: "TYT Din Kültürü" }) })
    const fiz = topic("fiz", { subject_id: "fiz", subject_name: "TYT Fizik", weight: 0.58, coefficient: 1.07, effective: 45, assessment: "eksik", sizeFactor: topicSizeFactor({ subjectName: "TYT Fizik" }) })
    const r = buildRoadmap({ ...base, topics: [fiz, din] })
    const e = (id: string) => r.items.find((i) => i.topic_id === id)!.efficiency!
    expect(e("din")).toBeGreaterThan(e("fiz"))
    // Hedef soru da konu büyüklüğüyle ölçeklenir.
    expect(r.items.find((i) => i.topic_id === "din")!.target_questions).toBeLessThan(r.items.find((i) => i.topic_id === "fiz")!.target_questions)
  })

  it("büyüklük: atom sayısı > gerçek soru sayısı > ders tipik büyüklüğü; aralıkta sınırlı", () => {
    expect(topicSizeFactor({ subjectName: "AYT Matematik", atomCount: 15, subjectAvgAtoms: 10 })).toBe(2.25)
    expect(topicSizeFactor({ subjectName: "AYT Matematik", atomCount: 40, subjectAvgAtoms: 10 })).toBe(2.5)
    expect(topicSizeFactor({ subjectName: "TYT Tarih", avgQuestions: 0.2, subjectAvgQuestions: 0.4 })).toBe(0.3)
    expect(topicSizeFactor({ subjectName: "TYT Din Kültürü" })).toBe(0.4)
  })
})

describe("ders taban payı ve haftalık saat göstergesi", () => {
  const base = { today: TODAY, examDate: EXAM, weeklyMinutes: 300, minutesPerQuestion: 1.5, existing: [], completedTopicIds: [], edges: [], puanTuru: "SAY" as const }
  const t = (id: string, subject: string, over: Partial<RoadmapTopicInput> = {}) =>
    topic(id, { subject_id: subject, subject_name: subject, coefficient: subjectCoefficient("SAY", subject), effective: 45, assessment: "eksik", ...over })
  // Çok verimli TYT Matematik konuları kapasiteyi tek başına doldurabilecek kadar çok.
  const many = Array.from({ length: 80 }, (_, i) => t(`m${i}`, "TYT Matematik", { weight: 2 }))
  const fiz = [t("tf1", "TYT Fizik", { weight: 0.3 }), t("tf2", "TYT Fizik", { weight: 0.3 })]
  const ayt = [t("af1", "AYT Fizik", { weight: 0.3, effective: 10, assessment: "hic_gormedim" }), t("ak1", "AYT Kimya", { weight: 0.3, effective: 10, assessment: "hic_gormedim" })]
  const kim = [t("tk1", "TYT Kimya", { weight: 0.3 })]

  it("puan türündeki hiçbir ders sıfır saat almaz; AYT dersi tabanla girince TYT kapısı da plana girer", () => {
    const r = buildRoadmap({ ...base, topics: [...many, ...fiz, ...kim, ...ayt] })
    const planned = (subject: string) => r.items.filter((i) => i.subject_name === subject && i.status !== "zaman_kalirsa").length
    expect(r.items.some((i) => i.status === "zaman_kalirsa")).toBe(true)
    for (const s of ["TYT Matematik", "TYT Fizik", "TYT Kimya", "AYT Fizik", "AYT Kimya"]) expect(planned(s)).toBeGreaterThan(0)
    // AYT Fizik planda → TYT Fizik'in tüm konuları (kapı) planda ve korunuyor.
    expect(planned("TYT Fizik")).toBe(2)
    expect(r.items.filter((i) => i.subject_name === "TYT Fizik").every((i) => i.gate_for === "AYT Fizik")).toBe(true)
  })

  it("puan türü dışındaki ders taban almaz", () => {
    const w = new Map([
      ["mat", subjectScoreWeight("SAY", "AYT Matematik")],
      ["ede", subjectScoreWeight("SAY", "AYT Edebiyat")],
    ])
    expect(w.get("ede")).toBe(0)
    const f = subjectFloors(10000, w, 0.5)
    expect(f.has("ede")).toBe(false)
    expect(Math.round(f.get("mat")!)).toBe(5000)
  })

  it("taban payları toplamı kapasiteyi aşarsa orantılı küçülür", () => {
    const f = subjectFloors(1000, new Map([["a", 3], ["b", 1]]), 1.5)
    expect(f.get("a")! + f.get("b")!).toBeCloseTo(1000)
    expect(f.get("a")! / f.get("b")!).toBeCloseTo(3)
  })

  it("sorulmadı = 0 konular tamamen dışarı atılmaz; kaynak saymıyorsa 0", () => {
    expect(topicWeightFromRow({ avg: 0, sifirNedeni: "sorulmadi" }, 2)).toBe(0.3)
    expect(topicWeightFromRow({ avg: 0, sifirNedeni: "kaynak_saymiyor" }, 2)).toBe(0)
    expect(topicWeightFromRow({ avg: 1.4, sifirNedeni: null }, 2)).toBe(1.4)
    expect(topicWeightFromRow(undefined, 2)).toBeUndefined()
  })

  it("haftalık saat: kapasite yetmezse gereken > mevcut, ek saatle plana girecek dersler", () => {
    const r = buildRoadmap({ ...base, availableWeeklyMinutes: 23 * 60, topics: [...many, ...fiz, ...kim, ...ayt] })
    expect(r.weeklyHours!.current).toBe(23)
    expect(r.weeklyHours!.required).toBeGreaterThan(23)
    expect(r.weeklyHours!.steps[0].subjects).toContain("TYT Matematik")
  })
})
