import { describe, expect, it } from "vitest"
import { hasUtm, parseUtm } from "@/lib/analytics/utm"

describe("parseUtm", () => {
  it("dört alanı okur, boşları null yapar, 100 karakterde keser", () => {
    const u = parseUtm(`?utm_source=ig&utm_medium=paid&utm_campaign=${"x".repeat(150)}&utm_content=&fbclid=abc`)
    expect(u).toEqual({ utm_source: "ig", utm_medium: "paid", utm_campaign: "x".repeat(100), utm_content: null })
    expect(hasUtm(u)).toBe(true)
  })

  it("UTM yoksa hasUtm false", () => {
    expect(hasUtm(parseUtm("?fbclid=abc"))).toBe(false)
  })
})
