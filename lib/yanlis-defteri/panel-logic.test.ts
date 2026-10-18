import { describe, it, expect } from "vitest"
import {
  decrementType,
  emptyTypeCounts,
  fromRows,
  incrementAtom,
  incrementType,
  orderAtoms,
  toRpcItems,
  trimAtoms,
} from "@/lib/yanlis-defteri/panel-logic"
import { confidenceFor } from "@/lib/yanlis-defteri/constants"

describe("Kademe 1 sayaçları", () => {
  it("toplam yanlış sayısını geçemez", () => {
    let t = emptyTypeCounts()
    t = incrementType(t, "islem_hatasi", 2)
    t = incrementType(t, "bilgi_eksik", 2)
    t = incrementType(t, "dikkat_okuma", 2)
    expect(t).toMatchObject({ islem_hatasi: 1, bilgi_eksik: 1, dikkat_okuma: 0 })
  })

  it("bilmiyordum havuzu küçülünce atom atamaları budanır", () => {
    const t = { ...emptyTypeCounts(), bilgi_eksik: 2 }
    const r = decrementType(t, { a1: 1, a2: 1 }, "bilgi_eksik")
    expect(r.types.bilgi_eksik).toBe(1)
    expect(r.atoms).toEqual({ a1: 1 })
    expect(trimAtoms({ a1: 3 }, 1)).toEqual({ a1: 1 })
  })
})

describe("Kademe 2 atomları", () => {
  it("atom ataması bilmiyordum sayısını geçemez", () => {
    const t = { ...emptyTypeCounts(), bilgi_eksik: 1, islem_hatasi: 3 }
    const a1 = incrementAtom(t, {}, "x")
    expect(incrementAtom(t, a1, "y")).toEqual({ x: 1 })
  })

  it("RPC listesi: atom önce bilgi_eksik, taşan hic_fikrim_yok; kalan emin değilim", () => {
    const t = { ...emptyTypeCounts(), bilgi_eksik: 1, hic_fikrim_yok: 2, islem_hatasi: 2 }
    expect(toRpcItems(t, { a1: 2 })).toEqual([
      { error_type: "bilgi_eksik", knowledge_atom_id: "a1", count: 1 },
      { error_type: "hic_fikrim_yok", knowledge_atom_id: "a1", count: 1 },
      { error_type: "islem_hatasi", knowledge_atom_id: null, count: 2 },
      { error_type: "hic_fikrim_yok", knowledge_atom_id: null, count: 1 },
    ])
  })

  it("satırlardan geri kurulum toRpcItems ile tutarlı", () => {
    const { types, atoms } = fromRows([
      { error_type: "bilgi_eksik", knowledge_atom_id: "a1" },
      { error_type: "bilgi_eksik", knowledge_atom_id: null },
      { error_type: "islem_hatasi", knowledge_atom_id: null },
    ])
    expect(types).toMatchObject({ bilgi_eksik: 2, islem_hatasi: 1 })
    expect(atoms).toEqual({ a1: 1 })
    expect(toRpcItems(types, atoms).reduce((s, i) => s + i.count, 0)).toBe(3)
  })

  it("chip sırası: geçmiş yanlış sayısı, sonra müfredat sırası", () => {
    const atoms = [
      { id: "a", sort_order: 1 },
      { id: "b", sort_order: 2 },
      { id: "c", sort_order: 3 },
    ]
    expect(orderAtoms(atoms, { c: 5, b: 1 }).map((x) => x.id)).toEqual(["c", "b", "a"])
  })
})

describe("güven eşikleri (SQL ile aynı)", () => {
  it("konuda çözülen soruya göre", () => {
    expect([0, 19, 20, 49, 50, 149, 150].map(confidenceFor)).toEqual([
      "yetersiz",
      "yetersiz",
      "dusuk",
      "dusuk",
      "orta",
      "orta",
      "yuksek",
    ])
  })
})
