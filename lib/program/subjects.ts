import type { SubjectOption } from "@/components/program/program-item-dialog"

// Program dialog'u ders listesi: sınıfa göre LGS / YKS süzgeci (maarif dersleri her zaman).
// Koç ve öğrenci program sayfaları ortak kullanır.
export function filterProgramSubjects(subjects: SubjectOption[], grade: string | null | undefined): SubjectOption[] {
  if (!grade) return subjects
  const isLgs = grade === "7" || grade === "8"
  return subjects.filter((s) => {
    if (s.exam_type === "lgs") return isLgs
    if (s.exam_type === "tyt" || s.exam_type === "ayt") return !isLgs
    return true
  })
}
