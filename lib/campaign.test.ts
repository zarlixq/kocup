import { describe, expect, it } from "vitest"
import { isCampaignActive, type CampaignConfig } from "@/lib/campaign"

const cfg: CampaignConfig = {
  active: true,
  startsAt: "2026-10-22T00:00:00+03:00",
  endsAt: "2026-10-25T00:00:00+03:00",
}

describe("isCampaignActive", () => {
  it("başlangıçtan önce kapalı (Istanbul gece yarısı = 21:00 UTC)", () => {
    expect(isCampaignActive(new Date("2026-10-21T20:59:59Z"), cfg)).toBe(false)
    expect(isCampaignActive(new Date("2026-10-21T21:00:00Z"), cfg)).toBe(true)
  })

  it("bitiş anı hariç", () => {
    expect(isCampaignActive(new Date("2026-10-24T20:59:59Z"), cfg)).toBe(true)
    expect(isCampaignActive(new Date("2026-10-24T21:00:00Z"), cfg)).toBe(false)
  })

  it("active=false ise tarih aralığında da kapalı", () => {
    expect(isCampaignActive(new Date("2026-10-23T12:00:00Z"), { ...cfg, active: false })).toBe(false)
  })
})
