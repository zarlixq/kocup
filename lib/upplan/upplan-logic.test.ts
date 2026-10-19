import { describe, expect, it } from "vitest"
import {
  decrementTopic,
  fromExamRows,
  incrementTopic,
  setTopicAtom,
  setTopicType,
  subjectTotal,
  toExamRpcItems,
  type SubjectWrongs,
} from "@/lib/upplan/exam-wrongs-logic"
import { pickAlert, pickReviews, reviewText } from "@/lib/upplan/today"
import { defaultsFromGrade, scopeSubjects } from "@/lib/upplan/profile"

describe("deneme yanlış paneli", () => {
  it("chip basışı sayaç artırır, dersin yanlışını geçemez", () => {
    let s: SubjectWrongs = {}
    s = incrementTopic(s, "t1", 2)
    s = incrementTopic(s, "t2", 2)
    s = incrementTopic(s, "t1", 2)
    expect(subjectTotal(s)).toBe(2)
    expect(s.t1.groups[0].count).toBe(1)
  })

  it("azaltınca sıfırlanan konu silinir", () => {
    let s = incrementTopic({}, "t1", 5)
    s = decrementTopic(s, "t1")
    expect(s).toEqual({})
    expect(decrementTopic({}, "t1")).toEqual({})
  })

  it("tip seçimi birincil grubu değiştirir; işlem hatasında atom temizlenir", () => {
    let s = incrementTopic({}, "t1", 5)
    s = setTopicAtom(s, "t1", "a1")
    s = setTopicType(s, "t1", "bilgi_eksik")
    expect(s.t1.groups[0]).toEqual({ error_type: "bilgi_eksik", knowledge_atom_id: "a1", count: 1 })
    s = setTopicType(s, "t1", "islem_hatasi")
    expect(s.t1.groups[0].knowledge_atom_id).toBeNull()
  })

  it("mevcut farklı tipli satırlar korunur ve RPC listesine geri döner", () => {
    const rows = [
      { topic_id: "t1", error_type: null, knowledge_atom_id: null },
      { topic_id: "t1", error_type: null, knowledge_atom_id: null },
      { topic_id: "t1", error_type: "islem_hatasi" as const, knowledge_atom_id: null },
      { topic_id: "x", error_type: null, knowledge_atom_id: null },
    ]
    const state = fromExamRows(rows, (id) => (id === "t1" ? "s1" : undefined))
    expect(state.s1.t1.groups[0]).toEqual({ error_type: null, knowledge_atom_id: null, count: 2 })
    const items = toExamRpcItems(state)
    expect(items).toHaveLength(2)
    expect(items.reduce((n, i) => n + i.count, 0)).toBe(3)
  })

  it("birincil grup boşken azaltma diğer gruptan düşer", () => {
    const s: SubjectWrongs = {
      t1: {
        groups: [
          { error_type: null, knowledge_atom_id: null, count: 0 },
          { error_type: "islem_hatasi", knowledge_atom_id: null, count: 2 },
        ],
      },
    }
    expect(decrementTopic(s, "t1").t1.groups[1].count).toBe(1)
  })
})

describe("Bugün: tekrar önerisi", () => {
  const today = "2026-10-19"
  it("etkili skoru en çok düşmüş 2 konu; kanıtsız ve düşüşü küçük olanlar elenir", () => {
    const r = pickReviews(
      [
        { topic_id: "a", topic_name: "A", stored: 80, effective: 79.5, last_practiced_at: "2026-10-18" },
        { topic_id: "b", topic_name: "Üslü Sayılar", stored: 70, effective: 60, last_practiced_at: "2026-10-13" },
        { topic_id: "c", topic_name: "C", stored: 75, effective: 75, last_practiced_at: null },
        { topic_id: "d", topic_name: "D", stored: 90, effective: 70, last_practiced_at: "2026-09-01" },
        { topic_id: "e", topic_name: "E", stored: 60, effective: 55, last_practiced_at: "2026-10-01" },
      ],
      today,
    )
    expect(r.map((x) => x.topic_id)).toEqual(["d", "b"])
    expect(reviewText(r[1])).toBe("Üslü Sayılar konusuna 6 gündür dokunmadın, 15 soruluk tekrar")
  })
})

describe("Bugün: tek uyarı", () => {
  const exam = {
    exam_id: "e1",
    exam_name: "TYT 1",
    subjects: [
      { subject_name: "Matematik", wrong: 7, distributed: 0 },
      { subject_name: "Türkçe", wrong: 4, distributed: 0 },
    ],
  }
  it("fazla iyi değerlendirme önce gelir", () => {
    expect(pickAlert([{ topic_id: "t", topic_name: "T", effective: 50 }], exam)?.kind).toBe("overconfident")
  })
  it("yoksa son denemede ≥5 yanlışlı ve dağıtılmamış ders", () => {
    const a = pickAlert([], exam)
    expect(a).toMatchObject({ kind: "exam_subject", subject_name: "Matematik", wrong: 7 })
  })
  it("dağıtılmışsa ya da eşik altıysa uyarı yok", () => {
    expect(pickAlert([], { ...exam, subjects: [{ subject_name: "Matematik", wrong: 7, distributed: 7 }] })).toBeNull()
    expect(pickAlert([], null)).toBeNull()
  })
})

describe("profil", () => {
  it("students.grade'den ön değer", () => {
    expect(defaultsFromGrade("Mezun")).toEqual({ status: "mezun", grade: null, segment: "yks" })
    expect(defaultsFromGrade("8")).toEqual({ status: "lise", grade: 8, segment: "lgs" })
    expect(defaultsFromGrade("11").segment).toBe("yks")
  })
  it("alan → ders kapsamı", () => {
    const subjects = [
      { id: "1", name: "TYT Matematik", exam_type: "tyt", curriculum: "normal", order: 1 },
      { id: "2", name: "AYT Fizik", exam_type: "ayt", curriculum: "normal", order: 3 },
      { id: "3", name: "AYT Edebiyat", exam_type: "ayt", curriculum: "normal", order: 6 },
      { id: "4", name: "LGS Matematik", exam_type: "lgs", curriculum: "normal", order: 1 },
      { id: "5", name: "9. Sınıf Matematik", exam_type: null, curriculum: "maarif", order: 1 },
    ]
    expect(scopeSubjects({ segment: "yks", alan: "sayisal" }, subjects).map((s) => s.id)).toEqual(["1", "2"])
    expect(scopeSubjects({ segment: "yks", alan: "ea" }, subjects).map((s) => s.id)).toEqual(["1", "3"])
    expect(scopeSubjects({ segment: "yks", alan: "dil" }, subjects).map((s) => s.id)).toEqual(["1"])
    expect(scopeSubjects({ segment: "lgs", alan: null }, subjects).map((s) => s.id)).toEqual(["4"])
  })
})
