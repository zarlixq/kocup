import { describe, expect, it } from "vitest"
import { replaceableItems } from "@/lib/upplan/program-service"

// "Bu haftayı yeniden oluştur": hangi kalemler yeni taslakla değişir.
describe("replaceableItems", () => {
  const week = "2026-10-19" // Pazartesi
  const today = "2026-10-22" // Perşembe = 4
  const item = (id: string, day: number, role: string, done = false) => ({ id, day_of_week: day, created_by_role: role, is_completed: done })

  it("yalnız UpPlan'ın tamamlanmamış, bugün ve sonraki kalemleri", () => {
    const items = [
      item("ai-bugun", 4, "ai"),
      item("ai-pazar", 7, "ai"),
      item("ai-tamam", 5, "ai", true),
      item("ai-dun", 3, "ai"),
      item("ogrenci", 5, "student"),
      item("koc", 6, "coach"),
    ]
    expect(replaceableItems(items, week, today).map((i) => i.id)).toEqual(["ai-bugun", "ai-pazar"])
  })
})
