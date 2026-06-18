"use client"

import { useMemo, useState } from "react"
import type { CurriculumData, CurriculumKey, GradeLevel } from "@/lib/curriculum/topics"
import { subjectLevel } from "@/lib/curriculum/topics"

export type { CurriculumKey, GradeLevel }

/**
 * [Normal Düzen] | [Maarif Düzen] segmented switch.
 * Salt sunum bileşeni; state'i çağıran tarafta tutulur.
 */
export function CurriculumSwitch({
  value,
  onChange,
  className,
}: {
  value: CurriculumKey
  onChange: (value: CurriculumKey) => void
  className?: string
}) {
  const itemBase =
    "flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  return (
    <div
      role="group"
      aria-label="Müfredat düzeni"
      className={`inline-flex w-full max-w-xs items-center gap-1 rounded-lg bg-zinc-100 p-1 ${className ?? ""}`}
    >
      <button
        type="button"
        aria-pressed={value === "normal"}
        onClick={() => onChange("normal")}
        className={`${itemBase} ${
          value === "normal"
            ? "bg-white text-[#1B6B8A] shadow-sm"
            : "text-zinc-500 hover:text-zinc-700"
        }`}
      >
        Normal Düzen
      </button>
      <button
        type="button"
        aria-pressed={value === "maarif"}
        onClick={() => onChange("maarif")}
        className={`${itemBase} ${
          value === "maarif"
            ? "bg-white text-[#F97316] shadow-sm"
            : "text-zinc-500 hover:text-zinc-700"
        }`}
      >
        Maarif Düzen
      </button>
    </div>
  )
}

/**
 * [Lise] | [Ortaokul] segmented switch.
 * CurriculumSwitch'in birebir ikizi; düzen switch'inden bağımsız çalışır.
 * Salt sunum bileşeni; state'i çağıran tarafta tutulur.
 */
export function GradeLevelSwitch({
  value,
  onChange,
  className,
}: {
  value: GradeLevel
  onChange: (value: GradeLevel) => void
  className?: string
}) {
  const itemBase =
    "flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  return (
    <div
      role="group"
      aria-label="Seviye"
      className={`inline-flex w-full max-w-xs items-center gap-1 rounded-lg bg-zinc-100 p-1 ${className ?? ""}`}
    >
      <button
        type="button"
        aria-pressed={value === "lise"}
        onClick={() => onChange("lise")}
        className={`${itemBase} ${
          value === "lise"
            ? "bg-white text-[#1B6B8A] shadow-sm"
            : "text-zinc-500 hover:text-zinc-700"
        }`}
      >
        Lise
      </button>
      <button
        type="button"
        aria-pressed={value === "ortaokul"}
        onClick={() => onChange("ortaokul")}
        className={`${itemBase} ${
          value === "ortaokul"
            ? "bg-white text-[#F97316] shadow-sm"
            : "text-zinc-500 hover:text-zinc-700"
        }`}
      >
        Ortaokul
      </button>
    </div>
  )
}

/**
 * Aktif müfredat (Normal/Maarif) ve isteğe bağlı seviyeye (Lise/Ortaokul) göre
 * subjects/topics setini veren paylaşılan hook. İki eksen bağımsız çalışır.
 * - Düzen, dataset'i seçer (data.normal | data.maarif).
 * - `levelFilter: true` ise seviye, dersleri `subjectLevel()` ile süzer
 *   (grade → exam_type fallback). Seviyesi belirsiz (null) dersler her seviyede
 *   görünür (filtreden muaf). Varsayılan `false` → seviye filtresi UYGULANMAZ
 *   (çağıran kendi filtresini uygulayabilir; geriye dönük uyumlu davranış).
 * - maarifEmpty: Maarif verisi yoksa true → çağıran boş durum gösterir.
 * - levelEmpty: Seçili düzen (+ levelFilter ise seviye) içinde ders yoksa true.
 */
export function useCurriculumTopics(
  data: CurriculumData,
  options: {
    defaultCurriculum?: CurriculumKey
    defaultLevel?: GradeLevel
    levelFilter?: boolean
  } = {},
) {
  const { defaultCurriculum = "normal", defaultLevel = "lise", levelFilter = false } = options
  const [curriculum, setCurriculum] = useState<CurriculumKey>(defaultCurriculum)
  const [level, setLevel] = useState<GradeLevel>(defaultLevel)

  const dataset = curriculum === "maarif" ? data.maarif : data.normal

  const { subjects, topics } = useMemo(() => {
    if (!levelFilter) return { subjects: dataset.subjects, topics: dataset.topics }
    const levelSubjects = dataset.subjects.filter((s) => {
      const lvl = subjectLevel(s)
      return lvl === null || lvl === level
    })
    const subjectIds = new Set(levelSubjects.map((s) => s.id))
    const levelTopics = dataset.topics.filter((t) => subjectIds.has(t.subject_id))
    return { subjects: levelSubjects, topics: levelTopics }
  }, [dataset, level, levelFilter])

  return {
    curriculum,
    setCurriculum,
    level,
    setLevel,
    isMaarif: curriculum === "maarif",
    subjects,
    topics,
    maarifEmpty: data.maarif.subjects.length === 0,
    levelEmpty: subjects.length === 0,
  }
}
