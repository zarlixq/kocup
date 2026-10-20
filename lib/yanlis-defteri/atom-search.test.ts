import { describe, expect, it } from "vitest"
import { indexAtoms, normalizeTr, searchAtoms, type CatalogAtom } from "@/lib/yanlis-defteri/atom-search"

describe("normalizeTr", () => {
  it("Türkçe karakter ve büyük/küçük harf duyarsız", () => {
    expect(normalizeTr("İSTİSNA")).toBe("istisna")
    expect(normalizeTr("ISIK")).toBe("isik")
    expect(normalizeTr("ışık")).toBe("isik")
    expect(normalizeTr("Şğüöç ŞĞÜÖÇ")).toBe("sguoc sguoc")
    expect(normalizeTr("Kâr ve İndirgeme")).toBe("kar ve indirgeme")
  })
})

let order = 0
function atom(id: string, name: string, topic: string, extra: Partial<CatalogAtom> = {}): CatalogAtom {
  order += 1
  return {
    id,
    name,
    type: "kural",
    description: null,
    sort_order: order,
    topic_id: topic,
    topic_name: topic,
    topic_order: topic === "asal" ? 2 : topic === "bol" ? 1 : 3,
    ...extra,
  }
}

const CATALOG = indexAtoms([
  atom("a1", "Asal sayı tanımı ve istisnaları", "asal"),
  atom("a2", "Aralarında asal sayılar", "bol"),
  atom("a3", "Bölme bağıntısı", "bol", { description: "Bölünen = bölen · bölüm + kalan; kalan asal olmak zorunda değil" }),
  atom("a4", "Pozitif bölen sayısı", "asal", { description: "Asal çarpanlara ayırıp üsleri bir artırarak çarp" }),
  atom("a5", "Kasaba problemi", "turev"),
  atom("a6", "Türev = teğetin eğimi", "turev"),
])

const ids = (q: string, topicId: string | null, history: Record<string, number> = {}) =>
  searchAtoms(CATALOG, q, { topicId, history }).map((h) => h.atom.id)

describe("searchAtoms", () => {
  it("ad ve açıklamada, Türkçe karaktersiz arar", () => {
    expect(ids("turev", null)).toEqual(["a6"])
    expect(ids("TEĞET", null)).toEqual(["a6"])
    expect(ids("carpan", null)).toEqual(["a4"])
  })

  it("kelime başı eşleşmeler kelime içindekilerden önce", () => {
    // "asa": a5 "Kasaba"da kelime içinde → en sonda
    expect(ids("asa", "turev").at(-1)).toBe("a5")
  })

  it("önce seçili konu, sonra geçmiş, sonra dersin geri kalanı", () => {
    // Bölünebilme seçili: a2 (adda) ve a3 (açıklamada) konudan; a1, a4 Asal Sayılar'dan
    expect(ids("asal", "bol")).toEqual(["a2", "a3", "a1", "a4"])
    // Geçmişte a4 seçilmiş → konunun atomlarından sonra, geri kalandan önce
    expect(ids("asal", "bol", { a4: 3 })).toEqual(["a2", "a3", "a4", "a1"])
    // Konu seçili değil: geçmiş önce; aynı kovada adda eşleşen, sonra konu sırası
    expect(ids("asal", null, { a3: 1 })).toEqual(["a3", "a2", "a1", "a4"])
  })

  it("her kelime eşleşmeli", () => {
    expect(ids("asal tanim", null)).toEqual(["a1"])
    expect(ids("asal yok", null)).toEqual([])
    expect(ids("   ", null)).toEqual([])
  })
})
