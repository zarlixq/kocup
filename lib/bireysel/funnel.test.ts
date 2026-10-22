import { describe, expect, it } from "vitest"
import { funnelTable } from "@/lib/bireysel/funnel"

describe("funnelTable", () => {
  it("oranlar, etiketler ve toplam", () => {
    const { rows, total } = funnelTable([
      { utm_source: null, utm_campaign: null, visits: 0, signups: 2, setups: 1, first_questions: 0 },
      { utm_source: "meta", utm_campaign: "ekim", visits: 200, signups: 20, setups: 10, first_questions: 5 },
    ])
    expect(rows[0]).toMatchObject({ sourceLabel: "meta", campaignLabel: "ekim", signupRate: 10, setupRate: 50, firstQuestionRate: 25 })
    expect(rows[1]).toMatchObject({ sourceLabel: "(doğrudan)", campaignLabel: "—", signupRate: null, setupRate: 50 })
    expect(total).toMatchObject({ visits: 200, signups: 22, setups: 11, first_questions: 5, signupRate: 11 })
  })

  it("boş girdi", () => {
    const { rows, total } = funnelTable([])
    expect(rows).toEqual([])
    expect(total.signupRate).toBeNull()
  })
})
