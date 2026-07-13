import { describe, it, expect } from "vitest"
import {
  istanbulDateStr,
  istanbulDayRange,
  istanbulDaysAgoStr,
  istanbulWeekStartStr,
} from "@/lib/tz"

// Regresyon: "Bugünkü Randevularım" gün penceresi Istanbul takvimine göre olmalı.
// Bug penceresi: 00:00–02:59 Istanbul (UTC hâlâ önceki günde).
// now'ı mock'layarak (parametre geçerek) gece ve gündüz aynı sonucu vermeli.

// 2026-07-14 02:00 Istanbul == 2026-07-13T23:00:00Z (bug penceresi içinde)
const geceUtc = new Date("2026-07-13T23:00:00Z")
// 2026-07-14 14:00 Istanbul == 2026-07-14T11:00:00Z (gündüz, zaten çalışıyordu)
const gunduzUtc = new Date("2026-07-14T11:00:00Z")

describe("istanbulDateStr", () => {
  it("gece ve gündüz aynı takvim gününü verir (2026-07-14)", () => {
    expect(istanbulDateStr(geceUtc)).toBe("2026-07-14")
    expect(istanbulDateStr(gunduzUtc)).toBe("2026-07-14")
  })
})

describe("istanbulDayRange — gün penceresi", () => {
  const gece = istanbulDayRange(geceUtc)
  const gunduz = istanbulDayRange(gunduzUtc)

  it("gece penceresi Istanbul 2026-07-14 gününü kapsar", () => {
    // Istanbul 2026-07-14 00:00 == 2026-07-13T21:00Z, ertesi gün 00:00 == 2026-07-14T21:00Z
    expect(gece.start.toISOString()).toBe("2026-07-13T21:00:00.000Z")
    expect(gece.end.toISOString()).toBe("2026-07-14T21:00:00.000Z")
  })

  it("gece ve gündüz TAM AYNI pencereyi döndürür", () => {
    expect(gece.start.getTime()).toBe(gunduz.start.getTime())
    expect(gece.end.getTime()).toBe(gunduz.end.getTime())
  })

  it("o günün 4 randevu saatini (13:00–16:00Z) kapsar, önceki/sonraki günü kapsamaz", () => {
    const inWindow = (iso: string) => {
      const t = new Date(iso).getTime()
      return t >= gece.start.getTime() && t < gece.end.getTime()
    }
    // 2026-07-14 16:00–19:00 Istanbul == 13:00–16:00Z — hepsi kapsanmalı
    expect(inWindow("2026-07-14T13:00:00Z")).toBe(true)
    expect(inWindow("2026-07-14T16:00:00Z")).toBe(true)
    // Sınır dışı: önceki gün son randevu ve ertesi gün ilk randevu
    expect(inWindow("2026-07-13T20:59:00Z")).toBe(false)
    expect(inWindow("2026-07-14T21:00:00Z")).toBe(false)
  })
})

describe("istanbulDaysAgoStr — DATE kolonu gün sınırı", () => {
  it("gece ve gündüz aynı 'bugün'ü (n=0) verir: 2026-07-14", () => {
    expect(istanbulDaysAgoStr(0, geceUtc)).toBe("2026-07-14")
    expect(istanbulDaysAgoStr(0, gunduzUtc)).toBe("2026-07-14")
  })

  it("gece ve gündüz aynı 'son 14 gün başlangıcı'nı (n=13) verir: 2026-07-01", () => {
    expect(istanbulDaysAgoStr(13, geceUtc)).toBe("2026-07-01")
    expect(istanbulDaysAgoStr(13, gunduzUtc)).toBe("2026-07-01")
  })

  it("ay başı (istanbulDateStr slice) gece ve gündüz aynı: 2026-07-01", () => {
    expect(istanbulDateStr(geceUtc).slice(0, 7) + "-01").toBe("2026-07-01")
    expect(istanbulDateStr(gunduzUtc).slice(0, 7) + "-01").toBe("2026-07-01")
  })
})

describe("istanbulWeekStartStr — haftanın Pazartesi'si", () => {
  it("gece ve gündüz aynı Pazartesi'yi verir", () => {
    // 2026-07-14 Salı → haftanın Pazartesi'si 2026-07-13
    expect(istanbulWeekStartStr(geceUtc)).toBe("2026-07-13")
    expect(istanbulWeekStartStr(gunduzUtc)).toBe("2026-07-13")
  })

  it("Pazar gecesi (bug penceresi) hâlâ o haftanın Pazartesi'sini verir", () => {
    // 2026-07-19 Pazar 02:00 Istanbul == 2026-07-18T23:00Z; hafta başı 2026-07-13
    const pazarGece = new Date("2026-07-18T23:00:00Z")
    expect(istanbulWeekStartStr(pazarGece)).toBe("2026-07-13")
  })
})
