import { describe, expect, it } from "vitest"
import { complianceUptoDay, dailyCompliance } from "@/lib/analytics/daily-compliance"

const WEEK = "2026-10-19" // Pazartesi

describe("dailyCompliance — gün bazlı uyum", () => {
  const days = [
    { day_of_week: 2, total: 5, done: 5 }, // Salı %100
    { day_of_week: 3, total: 5, done: 0 }, // Çarşamba %0
    { day_of_week: 5, total: 4, done: 1 }, // Cuma %25
  ]

  it("Çarşamba günü: Salı %100 ve Çarşamba %0 → %50 (gelecek günler sayılmaz)", () => {
    expect(dailyCompliance(days, 3)).toEqual({ percent: 50, totalItems: 10, doneItems: 5, countedDays: 2 })
  })

  it("Pazar günü haftanın bütün programlı günlerinin ortalaması", () => {
    // (100 + 0 + 25) / 3 = 41.67 → 42 (kalem oranı 6/14 = %43 olurdu)
    expect(dailyCompliance(days, 7).percent).toBe(42)
  })

  it("programı olmayan günler ve kalemsiz günler hesaba girmez; hiç gün yoksa null", () => {
    expect(dailyCompliance(days, 1).percent).toBeNull()
    expect(dailyCompliance([{ day_of_week: 1, total: 0, done: 0 }], 7).percent).toBeNull()
  })

  it("haftanın hangi gününe kadar: içinde → bugün, geçmiş → 7, gelecek → 0", () => {
    expect(complianceUptoDay(WEEK, "2026-10-21")).toBe(3)
    expect(complianceUptoDay(WEEK, "2026-10-19")).toBe(1)
    expect(complianceUptoDay(WEEK, "2026-11-02")).toBe(7)
    expect(complianceUptoDay(WEEK, "2026-10-18")).toBe(0)
  })
})
