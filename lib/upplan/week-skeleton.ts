import {
  ALAN_CORE_SUBJECT,
  HEAVY_SUBJECTS,
  LOW_VALUE_SUBJECTS,
  UPPLAN_TRACK_SQL_CONFIG as C,
} from "@/lib/upplan/config"
import { subjectScoreWeight } from "@/lib/upplan/roadmap"
import type { PuanTuru } from "@/lib/upplan/config"
import type { PracticeGroupInput, SkeletonSpec } from "@/lib/upplan/scheduler"
import type { Track } from "@/lib/upplan/track"

// Haftalık programın track'e özgü iskeleti ve ders payları — saf fonksiyonlar.

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7]
/** Bağlam temelli blok günleri tercih sırası (Cumartesi önce). */
const CONTEXT_DAYS = [6, 3, 1, 5]

/** Hedef sıralama baskısı (0..rank_pressure_boost): sıralama iddialıysa AYT dersleri ağırlaşır. */
export function rankPressure(targetRanking: number | null | undefined): number {
  if (!targetRanking || targetRanking <= 0) return 0
  const hi = Math.log10(C.rank_reference_max)
  const lo = Math.log10(C.rank_reference_min)
  const x = (hi - Math.log10(targetRanking)) / (hi - lo)
  return Math.round(Math.min(Math.max(x, 0), 1) * C.rank_pressure_boost * 1000) / 1000
}

export type SubjectInfo = { id: string; name: string; ders_key: string | null; exam_type: string | null }

/**
 * Ders payı ağırlığı = sınavdaki puan ağırlığı (soru × puan türü katsayısı)
 * × ustalık açığı (alt sınır subject_gap_floor) × (AYT ise 1 + sıralama baskısı).
 */
export function subjectWeightsFor(
  subjects: SubjectInfo[],
  avgEffective: Map<string, number>,
  puanTuru: PuanTuru | null,
  targetRanking: number | null,
): Record<string, number> {
  const pressure = rankPressure(targetRanking)
  const out: Record<string, number> = {}
  for (const s of subjects) {
    const gap = Math.max(1 - (avgEffective.get(s.id) ?? 0) / 100, C.subject_gap_floor)
    const w = subjectScoreWeight(puanTuru, s.name) * gap * (s.exam_type === "ayt" ? 1 + pressure : 1)
    out[s.id] = Math.round(w * 1000) / 1000
  }
  return out
}

const matches = (list: readonly string[], s: SubjectInfo) => list.includes(s.name) || (!!s.ders_key && list.includes(s.ders_key))

export function lowValueSubjectIds(subjects: SubjectInfo[], alan: string | null, track: Track): string[] {
  // 9-10'da bütün okul dersleri aynı önemde (alan yok).
  if (!alan || track === "maarif_9" || track === "maarif_10") return []
  const list = LOW_VALUE_SUBJECTS[alan] ?? []
  // Maarif 11'de alt sınıf (9-10) dersleri ders_key ile eşleşmesin: yalnız ad listesi + 11. sınıf dersleri.
  return subjects.filter((s) => matches(list, s)).map((s) => s.id)
}

export function heavySubjectIds(subjects: SubjectInfo[]): string[] {
  return subjects.filter((s) => matches(HEAVY_SUBJECTS, s)).map((s) => s.id)
}

export function coreSubjectId(subjects: SubjectInfo[], alan: string | null, track: Track): string | null {
  if (!alan || (track !== "eski_12" && track !== "maarif_12" && track !== "mezun")) return null
  const name = ALAN_CORE_SUBJECT[alan]
  return name ? (subjects.find((s) => s.name === name)?.id ?? null) : null
}

export type SkeletonParams = {
  track: Track
  alan: string | null
  /** Bugünkü okul haftası (Maarif 10: 2. dönemde TYT temel etiketi). */
  schoolWeek: number
  /** Hedef YKS yılı bağlam temelliyse (2028+) bağlam bloğu. */
  contextExam: boolean
  practice: PracticeGroupInput[]
  /** Paragraf / problem bloklarının ders id'si (TYT Türkçe / TYT Matematik), yoksa null. */
  paragrafSubjectId: string | null
  problemSubjectId: string | null
}

/**
 * Günlük iskelet:
 *  - 12 / mezun (sayısal, EA, dil): her gün problem + paragraf soru bloğu (sürekli pratik konuları
 *    dönüşümlü); sözel: paragraf + şiir yorumu (yoksa problem)
 *  - Maarif 9-10: hafta içi kısa paragraf + problem alışkanlığı (9'da sınav adı geçmez;
 *    10'da 2. dönemden TYT temel)
 *  - Maarif 11: kısa paragraf + problem (TYT temeli) + haftalık bağlam temelli blok
 *  - YKS 2028+ hedefleyen mezun: bağlam temelli blok
 */
export function skeletonFor(p: SkeletonParams): SkeletonSpec[] {
  const out: SkeletonSpec[] = []
  const group = (key: string) => p.practice.find((g) => g.key === key)
  const habitDays = ALL_DAYS.slice(0, C.maarif_habit_days)
  const ctx = (): SkeletonSpec => ({
    key: "baglam",
    label: "Bağlam temelli sorular",
    subject_id: null,
    minutes: C.context_block_minutes,
    days: CONTEXT_DAYS.slice(0, C.context_blocks_per_week),
    topics: [],
    block_type: "soru_cozum",
    neden: "Yeni soru tipi: metin, grafik ve günlük hayat bağlamı içeren beceri temelli sorular",
  })

  if (p.track === "maarif_9" || p.track === "maarif_10" || p.track === "maarif_11") {
    const tyt = p.track === "maarif_11" || (p.track === "maarif_10" && p.schoolWeek >= C.maarif_10_tyt_habit_from_week)
    out.push({
      key: "paragraf",
      label: tyt ? "Paragraf soruları (TYT temeli)" : "Günlük okuma: paragraf soruları",
      subject_id: tyt ? p.paragrafSubjectId : null,
      minutes: C.maarif_habit_minutes,
      days: habitDays,
      topics: tyt ? (group("paragraf")?.topics ?? []) : [],
      block_type: "soru_cozum",
      neden: "Her gün kısa okuma: anlama hızı ve beceri temelli sorular için alışkanlık",
    })
    out.push({
      key: "problem",
      label: tyt ? "Problem soruları (TYT temeli)" : "Günlük problem: beceri temelli soru",
      subject_id: tyt ? p.problemSubjectId : null,
      minutes: C.maarif_habit_minutes,
      days: habitDays,
      topics: tyt ? (group("problemler")?.topics ?? []) : [],
      block_type: "soru_cozum",
      neden: "Her gün kısa problem: matematiksel düşünmeyi canlı tutar",
    })
    if (p.track === "maarif_11") out.push(ctx())
    return out
  }
  if (p.track === "lgs") return out

  out.push({
    key: "paragraf",
    label: "Paragraf soruları",
    subject_id: p.paragrafSubjectId,
    minutes: C.skeleton_paragraf_minutes,
    days: ALL_DAYS,
    topics: group("paragraf")?.topics ?? [],
    block_type: "soru_cozum",
    neden: "Her gün paragraf: TYT Türkçe'nin büyük kısmı paragraf, hız ancak günlük pratikle gelir",
  })
  const siir = group("siir_yorum")
  if (p.alan === "sozel" && siir?.topics.length) {
    out.push({
      key: "siir",
      label: "Şiir yorumu",
      subject_id: siir.subject_id,
      minutes: C.skeleton_problem_minutes,
      days: ALL_DAYS,
      topics: siir.topics,
      block_type: "soru_cozum",
      neden: "Her gün şiir yorumu: AYT Edebiyat'ın en çok soru gelen becerisi",
    })
  } else {
    out.push({
      key: "problem",
      label: "Problem soruları",
      subject_id: p.problemSubjectId,
      minutes: C.skeleton_problem_minutes,
      days: ALL_DAYS,
      topics: group("problemler")?.topics ?? [],
      block_type: "soru_cozum",
      neden: "Her gün problem: TYT Matematik'in temel taşı, ara vermek hızı düşürür",
    })
  }
  if (p.contextExam) out.push(ctx())
  return out
}
