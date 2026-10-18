import { describe, it, expect } from "vitest"
import { computeAssignmentProgress, type ProgressSession } from "@/lib/assignments/progress"
import { deriveAssignmentStatus, goalSummary, isGoalMet, progressPercent } from "@/lib/assignments/constants"

const asg = { id: "a1", topic_id: "t1", baslangic_tarihi: "2026-10-01", son_tarih: "2026-10-31" }
const ses = (p: Partial<ProgressSession>): ProgressSession => ({
  assignment_id: null,
  topic_id: "t1",
  date: "2026-10-10",
  total_questions: 10,
  correct: 8,
  duration_minutes: 15,
  ...p,
})

describe("computeAssignmentProgress", () => {
  it("bağlı kayıt + aynı konudaki aralık içi kayıt sayılır", () => {
    const m = computeAssignmentProgress([asg], [
      ses({ assignment_id: "a1", topic_id: null }),
      ses({}),
      ses({ date: "2026-09-30" }), // aralık öncesi
      ses({ date: "2026-11-01" }), // aralık sonrası
      ses({ topic_id: "t2" }), // başka konu
      ses({ assignment_id: "a2" }), // başka hedefe bağlı
    ])
    expect(m.get("a1")).toEqual({ cozulen: 20, dogru: 16, sure: 30 })
  })

  it("kaydı olmayan hedef 0 döner", () => {
    expect(computeAssignmentProgress([asg], []).get("a1")).toEqual({ cozulen: 0, dogru: 0, sure: 0 })
  })
})

describe("hedef değerlendirme", () => {
  it("yalnız soru hedefi (eski çağrı biçimi)", () => {
    expect(isGoalMet(50, { hedefSoru: 50 })).toBe(true)
    expect(progressPercent(25, 50)).toBe(50)
    expect(deriveAssignmentStatus("aktif", 50, 50, "2026-10-31", new Date("2026-10-18"))).toBe("tamamlandi")
  })

  it("yalnız doğruluk hedefi: örneklem dolmadan tamamlanmaz", () => {
    expect(isGoalMet(5, { hedefSoru: null, hedefDogruluk: 80, dogru: 5 })).toBe(false)
    expect(isGoalMet(20, { hedefSoru: null, hedefDogruluk: 80, dogru: 17 })).toBe(true)
    expect(isGoalMet(20, { hedefSoru: null, hedefDogruluk: 90, dogru: 17 })).toBe(false)
  })

  it("iki hedef: ikisi de gerekir, yüzde ortalama", () => {
    const t = { hedefSoru: 40, hedefDogruluk: 80, dogru: 16 }
    expect(isGoalMet(20, t)).toBe(false) // doğruluk %80 ama soru 20/40
    expect(progressPercent(20, t)).toBe(75) // (0.5 + 1) / 2
  })

  it("süresi geçmiş ve tutmamış → gecikti", () => {
    expect(
      deriveAssignmentStatus("aktif", 10, { hedefSoru: 50 }, "2026-10-10", new Date("2026-10-18")),
    ).toBe("gecikti")
  })

  it("özet metni", () => {
    expect(goalSummary(32, { hedefSoru: 50 })).toBe("32 / 50 soru")
    expect(goalSummary(32, { hedefSoru: null, hedefDogruluk: 80, dogru: 25 })).toBe("32 soru · %78 (hedef %80)")
  })
})
