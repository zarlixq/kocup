import { describe, expect, it } from "vitest"
import { eduEndYear, examYearFor, graduationYearFor, isContextBasedExamYear, trackFor, trackHours } from "@/lib/upplan/track"
import { readiness } from "@/lib/upplan/roadmap-service"
import { scopeSubjects } from "@/lib/upplan/profile"
import { roadmapWarnings } from "@/lib/upplan/debug"
import { maarifOverflowMessage } from "@/lib/upplan/roadmap-maarif"
import { skeletonFor } from "@/lib/upplan/week-skeleton"
import { maarifRoadmap, profile, SCHOOL_END, TODAY, YKS_2027, yksInput, yksRoadmap } from "@/tests/upplan/fixtures"
import { buildRoadmap, type Roadmap } from "@/lib/upplan/roadmap"

const summary = (r: Roadmap) => ({
  examDate: r.examDate,
  counts: {
    aktif: r.items.filter((i) => i.status === "aktif").length,
    sirada: r.items.filter((i) => i.status === "sirada").length,
    zaman_kalirsa: r.items.filter((i) => i.status === "zaman_kalirsa").length,
  },
  first: r.items.slice(0, 6).map((i) => `${i.subject_name} › ${i.topic_name} [${i.status}] ${i.reasons[0]}`),
  overflow: r.overflow?.message ?? null,
  notes: r.notes,
})

describe("track: mezuniyet yılından (tek kaynak)", () => {
  it("2026-27 eğitim yılı: 9/10/11 Maarif, 12 eski, geçen yıl mezun", () => {
    expect(eduEndYear(TODAY)).toBe(2027)
    expect([2030, 2029, 2028, 2027, 2026].map((y) => trackFor(y, TODAY))).toEqual(["maarif_9", "maarif_10", "maarif_11", "eski_12", "mezun"])
  })
  it("sınıf atlama otomatik: Temmuz'da yıl döner, 12 bitince mezun", () => {
    expect(trackFor(2030, "2027-07-01")).toBe("maarif_10")
    expect(trackFor(2027, "2027-07-01")).toBe("mezun")
    expect(trackFor(2028, "2027-07-01")).toBe("maarif_12")
  })
  it("students.grade metni → mezuniyet yılı", () => {
    expect(graduationYearFor("Mezun", TODAY)).toBe(2026)
    expect(graduationYearFor("9", TODAY)).toBe(2030)
    expect(graduationYearFor("12", TODAY)).toBe(2027)
    expect(graduationYearFor(null, TODAY)).toBeNull()
  })
  it("sınav yılı = mezuniyet yılı; mezun varsayılanı YKS 2027, 2028+ bağlam temelli", () => {
    expect(examYearFor({ track: "eski_12", graduation_year: 2027, target_exam_year: null }, TODAY)).toBe(2027)
    expect(examYearFor({ track: "maarif_11", graduation_year: 2028, target_exam_year: null }, TODAY)).toBe(2028)
    expect(examYearFor({ track: "mezun", graduation_year: 2026, target_exam_year: null }, TODAY)).toBe(2027)
    const y = examYearFor({ track: "mezun", graduation_year: 2026, target_exam_year: 2028 }, TODAY)
    expect(y).toBe(2028)
    expect(isContextBasedExamYear(y)).toBe(true)
    expect(isContextBasedExamYear(2027)).toBe(false)
  })
  it("varsayılan haftalık ek çalışma aralıkları", () => {
    expect(trackHours("maarif_9")).toEqual({ min: 6, max: 10 })
    expect(trackHours("mezun")).toEqual({ min: 35, max: 45 })
  })
})

describe("kenar durumlar (fail-loud)", () => {
  it("müsaitlik 0 → üretim yok", () => {
    expect(readiness(profile({ availability: {} }), TODAY)).toMatchObject({ code: "no_availability" })
  })
  it("sınıf yok (grade null, track null) → üretim yok", () => {
    expect(readiness(profile({ graduation_year: null, track: null, grade: null }), TODAY)).toMatchObject({ code: "no_track" })
  })
  it("9'da alan dolu olsa da kapsam yalnız 9. sınıf Maarif dersleri", () => {
    const subjects = [
      { id: "m9", name: "9. Sınıf Matematik", exam_type: null, curriculum: "maarif", order: 101, grade: 9, ders_key: "matematik" },
      { id: "m10", name: "10. Sınıf Matematik", exam_type: null, curriculum: "maarif", order: 201, grade: 10, ders_key: "matematik" },
      { id: "tyt", name: "TYT Matematik", exam_type: "tyt", curriculum: "normal", order: 2, grade: null, ders_key: null },
      { id: "ayt", name: "AYT Edebiyat", exam_type: "ayt", curriculum: "normal", order: 20, grade: null, ders_key: null },
    ]
    expect(scopeSubjects({ segment: "yks", alan: "ea", track: "maarif_9" }, subjects).map((s) => s.id)).toEqual(["m9"])
    expect(scopeSubjects({ segment: "yks", alan: "ea", track: "eski_12" }, subjects).map((s) => s.id)).toEqual(["tyt", "ayt"])
  })
  it("mezun YKS 2028 seçtiyse haftaya bağlam temelli blok girer", () => {
    const sk = skeletonFor({ track: "mezun", alan: "sayisal", schoolWeek: 0, contextExam: true, practice: [], paragrafSubjectId: "tr", problemSubjectId: "mat" })
    expect(sk.map((s) => s.key)).toContain("baglam")
    const sk27 = skeletonFor({ track: "mezun", alan: "sayisal", schoolWeek: 0, contextExam: false, practice: [], paragrafSubjectId: "tr", problemSubjectId: "mat" })
    expect(sk27.map((s) => s.key)).not.toContain("baglam")
  })
})

describe("golden: track başına iki öğrenci (sıfırdan + ustalıklı)", () => {
  for (const track of ["maarif_9", "maarif_10", "maarif_11"] as const) {
    for (const mastered of [false, true]) {
      it(`${track} ${mastered ? "ustalıklı" : "sıfırdan"}`, () => {
        const r = maarifRoadmap(track, { mastered })
        expect(summary(r)).toMatchSnapshot()
        // Invariant: TYT/AYT konusu yok, ufuk ders yılı sonu, track tutarlı.
        expect(roadmapWarnings(track, r)).toEqual([])
        expect(r.examDate).toBe(SCHOOL_END)
        expect(r.items.every((i) => !/^(TYT|AYT) /.test(i.subject_name))).toBe(true)
      })
    }
  }
  for (const track of ["eski_12", "mezun"] as const) {
    for (const mastered of [false, true]) {
      it(`${track} ${mastered ? "ustalıklı" : "sıfırdan"}`, () => {
        const r = yksRoadmap({ track, mastered })
        expect(summary(r)).toMatchSnapshot()
        expect(roadmapWarnings(track, r, YKS_2027)).toEqual([])
        // AYT kilidi konu bazlı: AYT Matematik ilk günden planda (aktif).
        expect(r.items.some((i) => i.subject_name === "AYT Matematik" && i.status === "aktif")).toBe(true)
        expect(r.aytForceStart).toBeUndefined()
      })
    }
  }
})

describe("segmente uygun mesajlar", () => {
  it("9-10 overflow mesajında sınav dili yok; 11'de YKS 2028", () => {
    const r9 = maarifRoadmap("maarif_9", { weeklyMinutes: 60 })
    expect(r9.overflow).not.toBeNull()
    expect(r9.overflow!.message).not.toMatch(/YKS|TYT|AYT|yetişemiyorsun/)
    expect(roadmapWarnings("maarif_9", r9)).toEqual([])
    expect(maarifOverflowMessage("maarif_11", 5)).toMatch(/YKS 2028/)
  })
  it("12/mezun feda listesi hedef sıralamayı ve sona bırakılan konuları söyler", () => {
    const r = yksRoadmap({ weeklyMinutes: 240, targetRanking: 25000 })
    expect(r.overflow?.message).toMatch(/Hedefin 25\.000\. sıralama/)
    expect(r.sacrificed?.length).toBe(r.overflow?.count)
    // En düşük getiriden sıralı.
    const eff = r.sacrificed!.map((s) => s.efficiency)
    expect([...eff].sort((a, b) => a - b)).toEqual(eff)
  })
  it("geri alınan konu kapasiteye bakılmadan plana girer", () => {
    const base = yksRoadmap({ weeklyMinutes: 240 })
    const victim = base.sacrificed![0]
    const again = buildRoadmap({ ...yksInput({ weeklyMinutes: 240 }), keptTopicIds: [victim.topic_id] })
    expect(again.sacrificed?.some((t) => t.topic_id === victim.topic_id)).toBe(false)
    expect(again.items.find((i) => i.topic_id === victim.topic_id)?.status).not.toBe("zaman_kalirsa")
  })
})
