import { describe, expect, it } from "vitest"
import {
  computeMastery,
  effectiveMastery,
  isForgetting,
  masteryConfidence,
  masteryLabel,
  parseBreakdown,
} from "@/lib/upplan/mastery"

const TODAY = "2026-10-19"

// Beklenen değerler canlı DB'de compute_topic_mastery ile de doğrulandı
// (rollback'li test bloğu, 2026-10-19): 75 → 62.5 → 63.75 → 55.43.

describe("computeMastery — öncül", () => {
  it("tarama yoksa 40", () => {
    expect(computeMastery(null, [], TODAY).mastery).toBe(40)
  })
  it("taramadan 10 / 45 / 75", () => {
    expect(computeMastery("hic_gormedim", [], TODAY).mastery).toBe(10)
    expect(computeMastery("eksik", [], TODAY).mastery).toBe(45)
    expect(computeMastery("biliyorum", [], TODAY).mastery).toBe(75)
  })
})

describe("computeMastery — kanıt", () => {
  const session = { kind: "session" as const, date: TODAY, correct: 10, wrong: 10, empty: 0, typed: [] }

  it("soru kaydı skoru öncülle birleştirir (20 soru %50 → 62.5)", () => {
    // (20·0.75 + 10) / (20 + 20)
    expect(computeMastery("biliyorum", [session], TODAY).mastery).toBe(62.5)
  })

  it("tarama yoksa öncül zayıf: aynı kayıt 48", () => {
    // (5·0.40 + 10) / (5 + 20) = 0.48
    expect(computeMastery(null, [session], TODAY).mastery).toBe(48)
  })

  it("oturuma bağlı tam cezalı yanlış çift sayılmaz, yarım cezalı yarım soru geri verir", () => {
    const bilgi = { ...session, typed: ["bilgi_eksik" as const] }
    const islem = { ...session, typed: ["islem_hatasi" as const] }
    expect(computeMastery("biliyorum", [bilgi], TODAY).mastery).toBe(62.5)
    expect(computeMastery("biliyorum", [islem], TODAY).mastery).toBe(63.75)
  })

  it("deneme yanlışı ×2 ağırlıkla yanlış sayılır", () => {
    const ex = { kind: "exam_wrong" as const, date: TODAY, errorType: null }
    const r = computeMastery("biliyorum", [{ ...session, typed: ["islem_hatasi"] }, ex, ex, ex], TODAY)
    // (15 + 10.5) / (20 + 20 + 6)
    expect(r.mastery).toBe(55.43)
    expect(r.evidenceW).toBe(26)
  })

  it("çapraz yanlış atomun konusuna yarım ağırlıkla yansır (canlı DB testiyle aynı: 30.77)", () => {
    // Asal Sayılar: tarama yok, 3 çapraz bilgi_eksik/tipsiz yanlış → 100·(5·0.4) / (5 + 1.5)
    const cross = (errorType: "bilgi_eksik" | null) => ({ kind: "cross_wrong" as const, date: TODAY, errorType })
    const r = computeMastery(null, [cross("bilgi_eksik"), cross("bilgi_eksik"), cross(null)], TODAY)
    expect(r.mastery).toBe(30.77)
    expect(r.evidenceW).toBe(1.5)
  })

  it("eski kanıt yarı ömürle zayıflar (21 gün → yarı ağırlık)", () => {
    const old = { ...session, date: "2026-09-28", typed: ["islem_hatasi" as const] }
    // (15 + 0.5·10.5) / (20 + 0.5·20)
    expect(computeMastery("biliyorum", [old], TODAY).mastery).toBe(67.5)
  })

  it("as_of sonrası kanıt sayılmaz (trend)", () => {
    expect(computeMastery("biliyorum", [session], "2026-10-18").mastery).toBe(75)
  })
})

describe("effectiveMastery — unutma", () => {
  it("bugün çalışılmışsa değişmez", () => {
    expect(effectiveMastery(80, TODAY, TODAY)).toBe(80)
  })
  it("45 gün → tabanla arası yarıya iner (80 → 64)", () => {
    expect(effectiveMastery(80, "2026-09-04", TODAY)).toBe(64)
  })
  it("çok uzun sürede tabana (%60) yaklaşır, altına inmez", () => {
    const e = effectiveMastery(80, "2020-01-01", TODAY)
    expect(e).toBeGreaterThanOrEqual(48)
    expect(e).toBeLessThan(48.1)
  })
  it("kanıtsız (yalnız tarama) konu unutulmaz", () => {
    expect(effectiveMastery(75, null, TODAY)).toBe(75)
  })
  it("unutulmaya başlıyor işareti: effective < stored × 0.85", () => {
    expect(isForgetting(80, 68.5)).toBe(false)
    expect(isForgetting(80, 67.9)).toBe(true)
  })
})

describe("etiket ve güven", () => {
  it("etiket eşikleri 40 / 75", () => {
    expect(masteryLabel(39.99)).toBe("zayif")
    expect(masteryLabel(40)).toBe("gelisiyor")
    expect(masteryLabel(74.99)).toBe("gelisiyor")
    expect(masteryLabel(75)).toBe("iyi")
  })
  it("güven eşikleri 20 / 60", () => {
    expect(masteryConfidence(0)).toBe("dusuk")
    expect(masteryConfidence(20)).toBe("orta")
    expect(masteryConfidence(60)).toBe("yuksek")
  })
})

describe("parseBreakdown", () => {
  it("jsonb'yi güvenle tiplere çevirir", () => {
    const b = parseBreakdown({
      assessment: "biliyorum",
      prior: 75,
      session_count: 1,
      session_questions: 20,
      session_accuracy: 52.5,
      exam_wrongs: 3,
      loose_wrongs: 0,
      wrongs_by_type: { belirtilmedi: 3, islem_hatasi: 1 },
    })
    expect(b.assessment).toBe("biliyorum")
    expect(b.examWrongs).toBe(3)
    expect(b.wrongsByType).toEqual([
      { type: null, count: 3 },
      { type: "islem_hatasi", count: 1 },
    ])
  })
  it("bozuk girdide varsayılanlar", () => {
    expect(parseBreakdown(null).sessionAccuracy).toBeNull()
    expect(parseBreakdown("x").examWrongs).toBe(0)
  })
})
