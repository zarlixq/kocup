import { describe, expect, it } from "vitest"
import {
  dayNumberOf,
  detectDayStructure,
  groupIntoDays,
  isoWeekday,
  planDates,
  planStatus,
  planUnits,
  previewPlan,
  reflowPlan,
  weekdaysFromAvailability,
  type PlanVideo,
} from "@/lib/resources/playlist-plan"

// Bıyıklı Matematik "55 Günde TYT Matematik Kampı" başlıklarından kesit (gerçek sıra hataları dahil).
const KAMP = [
  "2027 TYT Matematik Kamplarımız",
  "55 Günde TYT Matematik Kampı | 1. Gün | Temel İşlem Aritmetiği | Konu Anlatımı 2027",
  "55 Günde TYT Matematik Kampı | 1. Gün | Temel İşlem Aritmetiği | ÖSYM Yaklaşım Soruları 2027",
  "55 Günde TYT Matematik Kampı | 2. Gün | Temel Kavramlar | Konu Anlatımı 2027",
  "55 Günde TYT Matematik Kampı | 2. Gün | Temel Kavramlar | ÖSYM Yaklaşım Soruları 2027",
  "55 Günde TYT Matematik Kampı | 10. Gün |Bölme Bölünebilme-1| Konu Anlatımı 2027",
  "55 Günde TYT Matematik Kampı | 10. Gün |Bölme Bölünebilme-2| Konu Anlatımı 2027",
  "55 Günde TYT Matematik Kampı | 10. Gün | Bölme-Bölünebilme | ÖSYM Yaklaşım Soruları 2027",
  "55 Günde TYT Matematik Kampı |13. Gün|Periyodik Durum İçeren Problemler| ÖSYM Yaklaşım Soruları 2027",
  "55 Günde TYT Matematik Kampı | 40. Gün | Kartezyen Çarpım 4 | Konu Anlatımı 2026",
  "55 Günde TYT Matematik Kampı |38. Gün| Kümeler 5 | ÖSYM Yaklaşım Soruları 2026",
  "55 Günde TYT Matematik Kampı | 41. Gün | Fonksiyonlar 1 | Konu Anlatımı 2026",
]
const v = (title: string, duration_seconds: number | null = 1200) => ({ title, duration_seconds })
const ALL = [1, 2, 3, 4, 5, 6, 7]

describe("N. Gün kalıbı", () => {
  it("gün numarası: '55 Günde' sayılmaz; '1. Gün', 'Gün 5', 'GÜN-7' sayılır", () => {
    expect(dayNumberOf(KAMP[1])).toBe(1)
    expect(dayNumberOf(KAMP[8])).toBe(13)
    expect(dayNumberOf("55 Günde TYT Matematik Kampı")).toBeNull()
    expect(dayNumberOf("Kamp Gün 5 - Türev")).toBe(5)
    expect(dayNumberOf("GÜN-7 İntegral")).toBe(7)
    expect(dayNumberOf("12.gün limit")).toBe(12)
    expect(dayNumberOf("1. Dereceden Denklemler")).toBeNull()
  })
  it("algılama oranı", () => {
    expect(detectDayStructure(KAMP).detected).toBe(true)
    expect(detectDayStructure(["Türev 1", "Türev 2", "1. Gün giriş"]).detected).toBe(false)
  })
  it("aynı günün videoları gruplanır; tanıtım ilk güne, geriye giden numara önceki güne", () => {
    const g = groupIntoDays(KAMP.map((t) => v(t)), "gun_yapisi", null)
    // tanıtım + 1. gün → 1; 2. gün → 2; 10. gün (3 video) → 3; 13 → 4; 40 → 5; 38 (sıra hatası) → 5; 41 → 6
    expect(g).toEqual([1, 1, 1, 2, 2, 3, 3, 3, 4, 5, 5, 6])
  })
  it("günde N video / günde X dakika", () => {
    const vids = [v("a", 600), v("b", 1500), v("c", 900), v("d", 3000), v("e", null)]
    expect(groupIntoDays(vids, "video", 2)).toEqual([1, 1, 2, 2, 3])
    // 40 dk: a(10)+b(25)=35, c(15) taşar → 2; d(50) taşar → 3 (tek başına); e (süre yok = 20 dk) → 4
    expect(groupIntoDays(vids, "dakika", 40)).toEqual([1, 1, 2, 3, 4])
  })
})

describe("tarihler", () => {
  it("hafta günü ve seçili günlere dağıtım", () => {
    expect(isoWeekday("2026-10-22")).toBe(4) // Perşembe
    expect(isoWeekday("2026-10-25")).toBe(7) // Pazar
    // Pzt/Çar/Cum, başlangıç 22.10 Per → ilk gün 23.10 Cum
    expect(planDates(4, "2026-10-22", [1, 3, 5])).toEqual(["2026-10-23", "2026-10-26", "2026-10-28", "2026-10-30"])
  })
  it("müsaitlik ızgarasından hafta günleri (boşsa her gün)", () => {
    expect(weekdaysFromAvailability({ "1": [4, 5], "3": [], "6": [10] })).toEqual([1, 6])
    expect(weekdaysFromAvailability({})).toEqual(ALL)
  })
  it("önizleme: gün sayısı, bitiş tarihi, en yoğun gün", () => {
    const p = previewPlan(KAMP.map((t) => v(t, 1800)), "gun_yapisi", null, "2026-10-22", ALL)
    expect(p.days).toBe(6)
    expect(p.end).toBe("2026-10-27")
    expect(p.maxDayMinutes).toBe(90)
  })
})

describe("kaydırma", () => {
  it("dünden kalan grup bugüne, sonrakiler birer gün ileri", () => {
    const units = [
      { day: 1, date: "2026-10-20", pending: false },
      { day: 2, date: "2026-10-21", pending: true }, // dün, izlenmedi
      { day: 3, date: "2026-10-22", pending: true },
      { day: 4, date: "2026-10-23", pending: true },
    ]
    expect(Object.fromEntries(reflowPlan(units, "2026-10-22", ALL))).toEqual({ 2: "2026-10-22", 3: "2026-10-23", 4: "2026-10-24" })
  })
  it("müsait olmayan gün atlanır; ileride boşluk varsa erkene çekilmez", () => {
    const units = [
      { day: 1, date: "2026-10-21", pending: true }, // Çar (dün)
      { day: 2, date: "2026-10-23", pending: true }, // Cum
      { day: 3, date: "2026-10-30", pending: true }, // sonraki Cum
    ]
    // Per/Cum/Cmt: 1 → 22 Per; 2 (23 Cum) ve 3 (30 Cum) yerinde
    expect(Object.fromEntries(reflowPlan(units, "2026-10-22", [4, 5, 6]))).toEqual({ 1: "2026-10-22" })
    // Yalnız Cum: 1 → 23 Cum, 2 → 30 Cum, 3 → 6 Kasım Cum
    expect(Object.fromEntries(reflowPlan(units, "2026-10-22", [5]))).toEqual({ 1: "2026-10-23", 2: "2026-10-30", 3: "2026-11-06" })
  })
  it("öndeyken değişiklik yok; durum: önde/geride, tahmini bitiş", () => {
    const vids: PlanVideo[] = [
      { plan_day: 1, planned_date: "2026-10-21", watch_status: "izlendi", duration_seconds: 600 },
      { plan_day: 2, planned_date: "2026-10-22", watch_status: "izlendi", duration_seconds: 600 },
      { plan_day: 3, planned_date: "2026-10-23", watch_status: "izlendi", duration_seconds: 600 },
      { plan_day: 4, planned_date: "2026-10-24", watch_status: "izlenmedi", duration_seconds: 600 },
    ]
    expect(reflowPlan(planUnits(vids), "2026-10-22", ALL).size).toBe(0)
    const s = planStatus(vids, "2026-10-22", ALL)
    expect(s.offsetDays).toBe(1)
    expect(s.estimatedEnd).toBe("2026-10-24")

    const late = vids.map((x) => ({ ...x, watch_status: "izlenmedi" }))
    const l = planStatus(late, "2026-10-22", ALL)
    expect(l.offsetDays).toBe(-1)
    expect(l.overdue).toBe(1)
    expect(l.plannedEnd).toBe("2026-10-24")
    expect(l.estimatedEnd).toBe("2026-10-25")
  })
})
