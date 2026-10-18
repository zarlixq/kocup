import { describe, it, expect } from "vitest"
import { atomKey, normalizeType, planImport, recordsFromJson } from "./atoms-import.mjs"

const T1 = "11111111-1111-4111-8111-111111111111"
const T_MISSING = "99999999-9999-4999-8999-999999999999"
const A1 = "aaaaaaaa-0000-4000-8000-000000000001"
const A2 = "aaaaaaaa-0000-4000-8000-000000000002"
const A3 = "aaaaaaaa-0000-4000-8000-000000000003"
const A_DB = "aaaaaaaa-0000-4000-8000-0000000000db"
const A_GHOST = "aaaaaaaa-0000-4000-8000-00000000ffff"

const rec = (over: Record<string, unknown>) => ({
  id: A1,
  konu_id: T1,
  konu_adi: "Üslü Sayılar",
  ad: "Üs kuralı",
  tip: "kural",
  aciklama: "$a^m a^n = a^{m+n}$",
  meb_kazanim_kodu: null,
  sira: 1,
  kaynak_url: "https://example.org",
  related_atom_ids: [],
  ...over,
})

const db = () => ({
  topics: new Map([[T1, { name: "Üslü Sayılar" }]]),
  existingAtoms: new Map([[atomKey(T1, "Var olan"), { id: A_DB, topic_id: T1, name: "Var olan" }]]),
})

describe("atom import planı", () => {
  it("tip normalizasyonu", () => {
    expect(normalizeType("Formül")).toBe("formul")
    expect(normalizeType("YÖNTEM")).toBe("yontem")
    expect(normalizeType("teorem")).toBeNull()
  })

  it("dosya biçimleri", () => {
    expect(recordsFromJson([1, 2])).toHaveLength(2)
    expect(recordsFromJson({ atoms: [1] })).toHaveLength(1)
    expect(recordsFromJson({ id: "x" })).toHaveLength(1)
  })

  it("geçerli kayıt + DB'de olmayan konu atlanır ve raporlanır", () => {
    const p = planImport(
      [
        { file: "a.json", record: rec({}) },
        { file: "a.json", record: rec({ id: A2, konu_id: T_MISSING, konu_adi: "Yeni konu" }) },
      ],
      db(),
    )
    expect(p.atoms).toHaveLength(1)
    expect(p.atoms[0]).toMatchObject({ id: A1, type: "kural", sort_order: 1 })
    expect(p.missingTopics).toEqual([{ konu_id: T_MISSING, konu_adi: "Yeni konu", count: 1 }])
  })

  it("tekrar eden id, bilinmeyen tip, aynı konu+ad çakışması atlanır", () => {
    const p = planImport(
      [
        { file: "a.json", record: rec({}) },
        { file: "b.json", record: rec({}) },
        { file: "b.json", record: rec({ id: A2, tip: "teorem", ad: "Başka" }) },
        { file: "b.json", record: rec({ id: A3, ad: "var olan" }) },
      ],
      db(),
    )
    expect(p.atoms.map((a: { id: string }) => a.id)).toEqual([A1])
    expect(p.skipped.map((s: { reason: string }) => s.reason)).toEqual([
      "Tekrarlanan id (ilk kayıt kullanıldı)",
      "Bilinmeyen tip: teorem",
      `Aynı konuda aynı adlı başka atom var (DB id ${A_DB})`,
    ])
  })

  it("konu adı uyuşmazlığı yalnız uyarı", () => {
    const p = planImport([{ file: "a.json", record: rec({ konu_adi: "Üslü İfadeler" }) }], db())
    expect(p.atoms).toHaveLength(1)
    expect(p.warnings).toHaveLength(1)
  })

  it("ön koşullar: batch/DB'de varsa yazılır, yoksa ertelenir, kendine bağlanamaz", () => {
    const p = planImport(
      [
        { file: "a.json", record: rec({ related_atom_ids: [A2, A_DB, A_GHOST, A1] }) },
        { file: "a.json", record: rec({ id: A2, ad: "Üs kuralı 2" }) },
      ],
      db(),
    )
    expect(p.prerequisites).toEqual([
      { atom_id: A1, prerequisite_atom_id: A2 },
      { atom_id: A1, prerequisite_atom_id: A_DB },
    ])
    expect(p.deferredPrerequisites).toEqual([{ atom_id: A1, prerequisite_atom_id: A_GHOST }])
    expect(p.warnings.some((w: { warning: string }) => w.warning.includes("kendisine"))).toBe(true)
  })
})
