"use client"

import { useState } from "react"
import type { CurriculumData, CurriculumKey } from "@/lib/curriculum/topics"

export type { CurriculumKey }

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
 * Aktif müfredata göre subjects/topics setini veren paylaşılan hook.
 * - Varsayılan: Normal Düzen.
 * - Normal: data.normal (çağıran kendi exam_type filtresini uygulayabilir).
 * - Maarif: data.maarif (exam_type filtresi UYGULANMAZ — her sınıfa açık).
 * - maarifEmpty: Maarif verisi yoksa true → çağıran boş durum gösterir.
 */
export function useCurriculumTopics(
  data: CurriculumData,
  defaultCurriculum: CurriculumKey = "normal",
) {
  const [curriculum, setCurriculum] = useState<CurriculumKey>(defaultCurriculum)
  const dataset = curriculum === "maarif" ? data.maarif : data.normal

  return {
    curriculum,
    setCurriculum,
    isMaarif: curriculum === "maarif",
    subjects: dataset.subjects,
    topics: dataset.topics,
    maarifEmpty: data.maarif.subjects.length === 0,
  }
}
