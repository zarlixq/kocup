// Sınıf → hangi sınav türleri için müfredat görsün?
// LGS: 7. ve 8. sınıf
// YKS (TYT + AYT): 9, 10, 11, 12, Mezun
// "okul" exam_type (genel okul denemesi) her zaman dahildir.
export type ExamType = "tyt" | "ayt" | "lgs"

export function gradeToExamTypes(grade: string | null | undefined): ExamType[] {
  if (!grade) return ["tyt", "ayt", "lgs"]
  if (grade === "7" || grade === "8") return ["lgs"]
  return ["tyt", "ayt"]
}

export function gradeIsLgs(grade: string | null | undefined): boolean {
  return grade === "7" || grade === "8"
}

export function examTypeLabel(grade: string | null | undefined): string {
  if (gradeIsLgs(grade)) return "LGS"
  if (!grade) return "—"
  return "YKS"
}
