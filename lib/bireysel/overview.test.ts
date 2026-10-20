import { describe, expect, it } from "vitest"
import { applyFilters, dailySignups, INDIVIDUAL_FILTER_DEFAULTS, isActive, summarize, utmBreakdown, type IndividualStudentRow } from "@/lib/bireysel/overview"

// 2026-10-20 12:00 Istanbul (09:00 UTC)
const NOW = new Date("2026-10-20T09:00:00Z")

function row(p: Partial<IndividualStudentRow>): IndividualStudentRow {
  return {
    id: "x", full_name: "Ayşe Yılmaz", email: "ayse@example.com", created_at: "2026-10-01T10:00:00Z",
    source: "ucretsiz_kayit", utm_source: null, utm_medium: null, utm_campaign: null, segment: "yks", alan: "sayisal",
    grade: "11", email_confirmed: true, upplan_completed: false, last_sign_in_at: null, sessions_7d: 0,
    first_session_date: null, last_activity_date: null, returned_d7: false, compliance_percent: null, ...p,
  }
}

describe("bireysel özet", () => {
  it("bugün/hafta yeni kayıt Istanbul gününe göre sayılır", () => {
    const rows = [
      row({ created_at: "2026-10-19T21:30:00Z", returned_d7: null }), // 20.10 00:30 Istanbul → bugün
      row({ created_at: "2026-10-15T10:00:00Z", returned_d7: null }),
      row({ created_at: "2026-10-01T10:00:00Z" }),
    ]
    const s = summarize(rows, NOW)
    expect(s.total).toBe(3)
    expect(s.newToday).toBe(1)
    expect(s.newThisWeek).toBe(2)
  })

  it("oranlar ve 7. gün paydası yalnız ölçülebilenler", () => {
    const rows = [
      row({ email_confirmed: true, upplan_completed: true, first_session_date: "2026-10-02", returned_d7: true }),
      row({ email_confirmed: false, returned_d7: false }),
      row({ email_confirmed: true, returned_d7: null }),
      row({ email_confirmed: true, returned_d7: null }),
    ]
    const s = summarize(rows, NOW)
    expect(s.verifiedRate).toBe(75)
    expect(s.setupRate).toBe(25)
    expect(s.firstSessionRate).toBe(25)
    expect(s.d7Eligible).toBe(2)
    expect(s.d7Rate).toBe(50)
    expect(summarize([], NOW).verifiedRate).toBeNull()
  })

  it("aktif = son 7 gün (bugün dahil) etkinlik", () => {
    expect(isActive(row({ last_activity_date: "2026-10-14" }), NOW)).toBe(true)
    expect(isActive(row({ last_activity_date: "2026-10-13" }), NOW)).toBe(false)
    expect(isActive(row({ last_activity_date: null }), NOW)).toBe(false)
  })

  it("utm kırılımı doğrudan gelenleri ayrı gruplar", () => {
    const b = utmBreakdown([row({ utm_source: "instagram" }), row({ utm_source: "instagram" }), row({})], NOW)
    expect(b[0]).toMatchObject({ source: "instagram", count: 2 })
    expect(b[1]).toMatchObject({ source: "(doğrudan)", count: 1 })
  })

  it("günlük kayıt serisi son N günü doldurur", () => {
    const d = dailySignups([row({ created_at: "2026-10-20T08:00:00Z" })], 7, NOW)
    expect(d).toHaveLength(7)
    expect(d[6]).toEqual({ month: "20.10", count: 1 })
    expect(d[0].count).toBe(0)
  })

  it("filtreler: kaynak, utm, tarih, kurulum, aktiflik, arama", () => {
    const rows = [
      row({ id: "a", source: "davet", upplan_completed: true, last_activity_date: "2026-10-19" }),
      row({ id: "b", source: null, full_name: "Ömer Işık", utm_source: "google", created_at: "2026-10-18T10:00:00Z" }),
    ]
    const f = INDIVIDUAL_FILTER_DEFAULTS
    expect(applyFilters(rows, { ...f, source: "davet" }, NOW).map((r) => r.id)).toEqual(["a"])
    expect(applyFilters(rows, { ...f, source: "diger" }, NOW).map((r) => r.id)).toEqual(["b"])
    expect(applyFilters(rows, { ...f, utm: "google" }, NOW).map((r) => r.id)).toEqual(["b"])
    expect(applyFilters(rows, { ...f, from: "2026-10-10" }, NOW).map((r) => r.id)).toEqual(["b"])
    expect(applyFilters(rows, { ...f, setup: "tamam" }, NOW).map((r) => r.id)).toEqual(["a"])
    expect(applyFilters(rows, { ...f, activity: "pasif" }, NOW).map((r) => r.id)).toEqual(["b"])
    expect(applyFilters(rows, { ...f, query: "ömer" }, NOW).map((r) => r.id)).toEqual(["b"])
  })
})
