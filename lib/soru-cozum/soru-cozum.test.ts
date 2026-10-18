import { describe, it, expect } from "vitest"
import { resolveCounts } from "@/lib/soru-cozum/counts"
import { accuracyBreakdown, addDays, dailyStreak, groupByDay, weeklySummary, type SessionStat } from "@/lib/soru-cozum/summary"

describe("resolveCounts", () => {
  it("hepsi dolu ve tutarlı → ok, türetilen yok", () => {
    expect(resolveCounts({ total: 40, correct: 32, wrong: 6, empty: 2 })).toMatchObject({
      status: "ok",
      derived: [],
      empty: 2,
    })
  })

  it("boş girilmezse soru sayısından hesaplar", () => {
    expect(resolveCounts({ total: 40, correct: 32, wrong: 6, empty: null })).toMatchObject({
      status: "ok",
      empty: 2,
      derived: ["empty"],
    })
  })

  it("doğru girilmezse hesaplar", () => {
    expect(resolveCounts({ total: 40, correct: null, wrong: 6, empty: 2 })).toMatchObject({
      status: "ok",
      correct: 32,
    })
  })

  it("soru sayısı girilmezse D+Y+B toplanır, eksik boş 0 sayılır", () => {
    expect(resolveCounts({ total: null, correct: 32, wrong: 6, empty: null })).toMatchObject({
      status: "ok",
      total: 38,
      empty: 0,
      derived: ["total", "empty"],
    })
  })

  it("tutarsız toplam → mismatch", () => {
    expect(resolveCounts({ total: 40, correct: 32, wrong: 6, empty: 5 }).status).toBe("mismatch")
  })

  it("bilinenler soru sayısını aşarsa → mismatch", () => {
    expect(resolveCounts({ total: 10, correct: 8, wrong: 5, empty: null }).status).toBe("mismatch")
  })

  it("soru sayısı + tek alan → eksik", () => {
    expect(resolveCounts({ total: 40, correct: 32, wrong: null, empty: null }).status).toBe("incomplete")
  })

  it("hiçbiri yok → eksik; negatif → geçersiz; sıfır soru → geçersiz", () => {
    expect(resolveCounts({ total: null, correct: null, wrong: null, empty: null }).status).toBe("incomplete")
    expect(resolveCounts({ total: 10, correct: -1, wrong: 5, empty: null }).status).toBe("invalid")
    expect(resolveCounts({ total: null, correct: 0, wrong: 0, empty: null }).status).toBe("invalid")
  })
})

describe("dailyStreak", () => {
  it("bugün dahil ardışık günler", () => {
    expect(dailyStreak(["2026-10-18", "2026-10-17", "2026-10-16", "2026-10-14"], "2026-10-18")).toEqual({
      days: 3,
      activeToday: true,
    })
  })

  it("bugün kayıt yoksa dünden sayar (seri kırılmaz)", () => {
    expect(dailyStreak(["2026-10-17", "2026-10-16"], "2026-10-18")).toEqual({ days: 2, activeToday: false })
  })

  it("dün de yoksa 0", () => {
    expect(dailyStreak(["2026-10-15"], "2026-10-18").days).toBe(0)
  })

  it("ay sınırını geçer", () => {
    expect(addDays("2026-11-01", -1)).toBe("2026-10-31")
    expect(dailyStreak(["2026-11-01", "2026-10-31"], "2026-11-01").days).toBe(2)
  })
})

const s = (date: string, subject: string, total: number, correct: number, topic: string | null = null): SessionStat => ({
  date,
  subject_id: subject,
  subject_name: subject.toUpperCase(),
  topic_id: topic,
  topic_name: topic,
  total_questions: total,
  correct,
})

describe("weeklySummary", () => {
  // 2026-10-18 Pazar 14:00 Istanbul → hafta 2026-10-12 Pzt
  const now = new Date("2026-10-18T11:00:00Z")

  it("bu hafta ve geçen haftanın aynı dönemi", () => {
    const res = weeklySummary(
      [
        s("2026-10-12", "mat", 40, 30),
        s("2026-10-18", "fiz", 20, 10),
        s("2026-10-18", "mat", 10, 10),
        s("2026-10-05", "mat", 25, 20), // geçen hafta Pzt
        s("2026-10-11", "mat", 99, 50), // geçen hafta Pazar — aynı dönemde (≤ 10-11)
        s("2026-10-04", "mat", 500, 0), // iki hafta önce, dahil değil
      ],
      now,
    )
    expect(res.weekStart).toBe("2026-10-12")
    expect(res.total).toBe(70)
    expect(res.prevTotal).toBe(124)
    expect(res.accuracy).toBe(71)
    expect(res.topSubject).toEqual({ name: "MAT", total: 50 })
  })

  it("boş haftada doğruluk null, en çok ders null", () => {
    const res = weeklySummary([], now)
    expect(res.accuracy).toBeNull()
    expect(res.topSubject).toBeNull()
  })
})

describe("accuracyBreakdown / groupByDay", () => {
  it("ders bazlı, soru sayısına göre azalan", () => {
    const rows = accuracyBreakdown([s("2026-10-18", "mat", 10, 5), s("2026-10-17", "fiz", 30, 30), s("2026-10-16", "mat", 10, 10)], "subject")
    expect(rows.map((r) => [r.id, r.total, r.accuracy])).toEqual([
      ["fiz", 30, 100],
      ["mat", 20, 75],
    ])
  })

  it("konu modunda konusuz kayıtlar tek grupta", () => {
    const rows = accuracyBreakdown([s("2026-10-18", "mat", 10, 5, null), s("2026-10-18", "mat", 10, 5, "t1")], "topic")
    expect(rows.map((r) => r.name).sort()).toEqual(["Konu belirtilmemiş", "t1"])
  })

  it("günlere göre azalan gruplar ve gün toplamları", () => {
    const groups = groupByDay([s("2026-10-16", "mat", 10, 5), s("2026-10-18", "mat", 20, 10), s("2026-10-16", "fiz", 5, 5)])
    expect(groups.map((g) => [g.date, g.total, g.correct])).toEqual([
      ["2026-10-18", 20, 10],
      ["2026-10-16", 15, 10],
    ])
  })
})
