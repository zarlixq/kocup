import { describe, expect, it } from "vitest"
import { goalCoaching, goalStage } from "@/lib/upplan/goal-stage"

const base = { topic_name: "Ardışık Sayılar", cozulen_soru: 26, hedef_soru: 120, learned_at: null, block_type: "konu_calisma" }

describe("hedef aşaması ve sonraki adım", () => {
  it("öğrenme aşaması: video varsa hoca + konu", () => {
    const c = goalCoaching({ ...base, learning_phase: "gerekli" }, { effective: 12, video: { teacher: "Bıyıklı Matematik", count: 1 } })
    expect(c.stage).toBe("ogren")
    expect(c.nextAction).toBe("Önce konuyu öğren: Bıyıklı Matematik – Ardışık Sayılar videosu")
    expect(c.canMarkLearned).toBe(true)
    expect(c.mastery).toEqual({ effective: 12, label: "zayif" })
  })
  it("öğrenildikten sonra soru aşaması: ilerleme", () => {
    const c = goalCoaching({ ...base, learning_phase: "gerekli", learned_at: "2026-10-20T10:00:00Z" }, { effective: 50, video: null })
    expect(c.stage).toBe("soru")
    expect(c.nextAction).toBe("Soru çöz: 26/120")
    expect(c.canMarkLearned).toBe(false)
  })
  it("eksik konu: opsiyonel kısa tekrar önerisi; tekrar hedefi: kalan soru", () => {
    expect(goalCoaching({ ...base, learning_phase: "opsiyonel", block_type: "soru_cozum" }, { effective: 45, video: null }).nextAction).toBe(
      "İstersen kısa tekrar yap, sonra soru çöz: 26/120",
    )
    expect(goalCoaching({ ...base, learning_phase: "yok", block_type: "tekrar", hedef_soru: 30, cozulen_soru: 15 }, { effective: 80, video: null }).nextAction).toBe(
      "Tekrar: 15 soru",
    )
    expect(goalStage({ learning_phase: null, learned_at: null, block_type: "soru_cozum" })).toBe("soru")
  })
})
