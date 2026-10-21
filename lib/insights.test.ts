import { describe, expect, it } from "vitest"
import { buildInsights, type InsightInput } from "@/lib/insights"
import { filterFromParams, mergeAnalizFilter, resolveRange, splitDate, DEFAULT_FILTER } from "@/lib/analytics/analiz/filter"

const base: InsightInput = { today: "2026-10-21", daily: [], subjects: [], topics: [], exams: [], streak: 0, unrepeatedWrongs: 0 }

describe("içgörüler", () => {
  it("haftalık düşüş", () => {
    const r = buildInsights({ ...base, daily: [{ day: "2026-10-20", questions: 20 }, { day: "2026-10-10", questions: 100 }] })
    expect(r[0]).toMatchObject({ id: "week-down", tone: "warning" })
    expect(r[0].text).toContain("%80")
  })
  it("az veride haftalık kural sessiz", () => {
    expect(buildInsights({ ...base, daily: [{ day: "2026-10-10", questions: 5 }] })).toEqual([])
  })
  it("zayıf konu + video, uzun ara, deneme yükselişi, seri", () => {
    const r = buildInsights({
      ...base,
      topics: [{ topic_name: "Türev", questions: 40, correct: 18, videos_total: 3, videos_watched: 0 }],
      subjects: [{ subject_name: "Kimya", questions: 50, correct: 30, minutes: 60, last_date: "2026-10-09" }],
      exams: [
        { date: "2026-09-01", exam_type: "tyt", subjects: [{ name: "Türkçe", net: 20 }] },
        { date: "2026-09-15", exam_type: "tyt", subjects: [{ name: "Türkçe", net: 22 }] },
        { date: "2026-10-01", exam_type: "tyt", subjects: [{ name: "Türkçe", net: 25.5 }] },
      ],
      streak: 4,
    })
    const ids = r.map((x) => x.id)
    expect(ids).toEqual(["weak-topic", "stale-subject", "exam-up", "streak"])
    expect(r[0].text).toContain("%45")
    expect(r[1].text).toContain("12 gündür")
  })
})

describe("analiz filtresi", () => {
  const now = new Date("2026-10-21T10:00:00+03:00")
  it("aralıklar", () => {
    expect(resolveRange({ ...DEFAULT_FILTER, range: "7g" }, now)).toMatchObject({ from: "2026-10-15", to: "2026-10-21", days: 7 })
    expect(resolveRange({ ...DEFAULT_FILTER, range: "tum" }, now)).toMatchObject({ from: null, days: null })
    expect(resolveRange({ range: "ozel", from: "2026-10-30", to: "2026-10-01", subjectId: null }, now)).toMatchObject({
      from: "2026-10-01",
      to: "2026-10-21",
      days: 21,
    })
  })
  it("URL > kayıtlı tercih, bozuk tercih varsayılana döner", () => {
    const saved = mergeAnalizFilter({ range: "3a", subjectId: "bozuk" })
    expect(saved).toEqual({ range: "3a", from: null, to: null, subjectId: null })
    expect(filterFromParams({}, saved).range).toBe("3a")
    expect(filterFromParams({ aralik: "7g" }, saved).range).toBe("7g")
    expect(mergeAnalizFilter(null)).toEqual(DEFAULT_FILTER)
  })
  it("gelişen konu ayrımı dönemin ortası", () => {
    expect(splitDate(resolveRange({ ...DEFAULT_FILTER, range: "30g" }, now), now)).toBe("2026-10-07")
  })
})
