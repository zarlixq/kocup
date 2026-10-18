import { describe, it, expect } from "vitest"
import { programItemSchema, shortTime } from "@/lib/program/item-schema"

const SUBJECT = "11111111-1111-4111-8111-111111111111"
const TOPIC = "22222222-2222-4222-8222-222222222222"

describe("programItemSchema", () => {
  it("ders + konu + saat aralığı + hedef geçerli", () => {
    const r = programItemSchema.safeParse({
      day_of_week: 2,
      start_time: "14:00",
      end_time: "15:30",
      subject_id: SUBJECT,
      topic_id: TOPIC,
      hedef_soru: "40",
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.hedef_soru).toBe(40)
  })

  it("ders da başlık da yoksa reddedilir", () => {
    expect(programItemSchema.safeParse({ day_of_week: 1 }).success).toBe(false)
  })

  it("konu dersiz olamaz", () => {
    expect(programItemSchema.safeParse({ day_of_week: 1, baslik: "x", topic_id: TOPIC }).success).toBe(false)
  })

  it("bitiş başlangıçtan önce / başlangıçsız bitiş reddedilir", () => {
    expect(
      programItemSchema.safeParse({ day_of_week: 1, baslik: "x", start_time: "15:00", end_time: "14:00" }).success,
    ).toBe(false)
    expect(programItemSchema.safeParse({ day_of_week: 1, baslik: "x", end_time: "14:00" }).success).toBe(false)
  })

  it("geçersiz saat biçimi ve gün reddedilir; boş saat null olur", () => {
    expect(programItemSchema.safeParse({ day_of_week: 1, baslik: "x", start_time: "25:00" }).success).toBe(false)
    expect(programItemSchema.safeParse({ day_of_week: 8, baslik: "x" }).success).toBe(false)
    const r = programItemSchema.safeParse({ day_of_week: 1, baslik: "x", start_time: "" })
    expect(r.success && r.data.start_time).toBe(null)
  })

  it("shortTime DB saatini kısaltır", () => {
    expect(shortTime("14:00:00")).toBe("14:00")
    expect(shortTime(null)).toBe(null)
  })
})
