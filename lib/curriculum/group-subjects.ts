// Ders dropdown'larının TEK gruplama kaynağı.
// - Normal düzen (exam_type dolu): sınav türüne göre grupla → LGS < TYT < AYT.
// - Maarif düzen (exam_type null, grade dolu): sınıfa göre grupla → "{grade}. Sınıf",
//   ağırlık = grade (5,6,7,9,10 artan; normal grupların 1-3'ünden sonraya düşer).
// - Her grup içinde `order` artan.
// Program (SubjectOption) ve konu-atama (CurriculumSubject) veri şekillerinin
// ikisiyle de çalışır — ortak minimal alan seti üzerinden normalize edilir.

export type GroupableSubject = {
  id: string
  name: string
  exam_type: string | null
  grade: number | null
  order: number | null
  curriculum?: string | null
}

export type SubjectGroup<T extends GroupableSubject = GroupableSubject> = {
  label: string
  weight: number
  subjects: T[]
}

// Normal düzen sınav türü sırası.
const EXAM_WEIGHT: Record<string, number> = { LGS: 1, TYT: 2, AYT: 3 }

function isMaarif(s: GroupableSubject): boolean {
  if (s.curriculum) return s.curriculum === "maarif"
  // curriculum alanı yoksa: normal dersler exam_type taşır, maarif taşımaz.
  return !s.exam_type
}

function groupOf(s: GroupableSubject): { label: string; weight: number } {
  if (isMaarif(s) && s.grade != null) {
    return { label: `${s.grade}. Sınıf`, weight: s.grade }
  }
  if (s.exam_type) {
    const key = s.exam_type.toUpperCase()
    return { label: key, weight: EXAM_WEIGHT[key] ?? 50 }
  }
  if (s.grade != null) return { label: `${s.grade}. Sınıf`, weight: s.grade }
  return { label: "Diğer", weight: 999 }
}

export function groupSubjectsByCurriculum<T extends GroupableSubject>(
  subjects: T[],
): SubjectGroup<T>[] {
  const map = new Map<string, { weight: number; subjects: T[] }>()
  for (const s of subjects) {
    const { label, weight } = groupOf(s)
    const entry = map.get(label)
    if (entry) entry.subjects.push(s)
    else map.set(label, { weight, subjects: [s] })
  }
  return Array.from(map.entries())
    .map(([label, { weight, subjects }]) => ({
      label,
      weight,
      subjects: [...subjects].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    }))
    .sort((a, b) => a.weight - b.weight)
}
