import { buildMaarifRoadmap, type MaarifRoadmapInput, type MaarifTopicInput, type MaarifTrack } from "@/lib/upplan/roadmap-maarif"
import { buildRoadmap, type RoadmapInput, type RoadmapTopicInput } from "@/lib/upplan/roadmap"
import type { UpplanProfile } from "@/lib/upplan/profile"

// Golden fixture'lar: canlı DB'den bağımsız, deterministik öğrenciler.

export const TODAY = "2026-10-24"
export const WEEK = "2026-10-26"
/** 2026-27 okul haftaları (school_calendar_weeks seed'iyle aynı). */
export const WEEK_STARTS = new Map<number, string>([
  [1, "2026-09-14"], [2, "2026-09-21"], [3, "2026-09-28"], [4, "2026-10-05"], [5, "2026-10-12"], [6, "2026-10-19"],
  [7, "2026-10-26"], [8, "2026-11-02"], [9, "2026-11-09"], [10, "2026-11-23"], [11, "2026-11-30"], [12, "2026-12-07"],
  [13, "2026-12-14"], [14, "2026-12-21"], [15, "2026-12-28"], [16, "2027-01-04"], [17, "2027-01-11"], [18, "2027-01-18"],
  [19, "2027-02-08"], [20, "2027-02-15"], [21, "2027-02-22"], [22, "2027-03-01"], [23, "2027-03-15"], [24, "2027-03-22"],
  [25, "2027-03-29"], [26, "2027-04-05"], [27, "2027-04-12"], [28, "2027-04-19"], [29, "2027-04-26"], [30, "2027-05-03"],
  [31, "2027-05-10"], [32, "2027-05-17"], [33, "2027-05-24"], [34, "2027-05-31"], [35, "2027-06-07"], [36, "2027-06-14"],
  [37, "2027-06-21"],
])
export const SCHOOL_END = "2027-06-25"
export const YKS_2027 = "2027-06-19"

const range = (a: number, b: number) => Array.from({ length: b - a }, (_, i) => a + i)
/** Hafta içi 17:00-21:00, hafta sonu 10:00-16:00. */
export const AVAIL_STUDENT = { "1": range(22, 30), "2": range(22, 30), "3": range(22, 30), "4": range(22, 30), "5": range(22, 30), "6": range(8, 20), "7": range(8, 20) }
/** Kurucu profili gibi: her gün 19:30-23:30 (28 saat). */
export const AVAIL_MEZUN = Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((d) => [String(d), range(27, 35)]))

export function profile(over: Partial<UpplanProfile> = {}): UpplanProfile {
  return {
    status: "lise",
    grade: 9,
    segment: "yks",
    alan: null,
    availability: AVAIL_STUDENT,
    focus_minutes: 45,
    target_department: null,
    target_ranking: null,
    setup_step: "bitti",
    completed_at: "2026-10-01T00:00:00Z",
    load_factor: 1,
    graduation_year: 2030,
    track: "maarif_9",
    target_exam_year: null,
    alan_egilimi: null,
    kept_topic_ids: [],
    ...over,
  }
}

// ── Maarif ──────────────────────────────────────────────────────────────
type MaarifSubject = { key: string; name: string; grade: number; topics: number; yks?: number }

const MAARIF_SUBJECTS: Record<MaarifTrack, MaarifSubject[]> = {
  maarif_9: [
    { key: "matematik", name: "9. Sınıf Matematik", grade: 9, topics: 19 },
    { key: "edebiyat", name: "9. Sınıf Edebiyat", grade: 9, topics: 18 },
    { key: "fizik", name: "9. Sınıf Fizik", grade: 9, topics: 20 },
    { key: "tarih", name: "9. Sınıf Tarih", grade: 9, topics: 13 },
  ],
  maarif_10: [
    { key: "matematik", name: "9. Sınıf Matematik", grade: 9, topics: 19 },
    { key: "matematik", name: "10. Sınıf Matematik", grade: 10, topics: 21 },
    { key: "kimya", name: "10. Sınıf Kimya", grade: 10, topics: 16 },
    { key: "tarih", name: "10. Sınıf Tarih", grade: 10, topics: 14 },
  ],
  maarif_11: [
    { key: "matematik", name: "9. Sınıf Matematik", grade: 9, topics: 19, yks: 0.8 },
    { key: "matematik", name: "10. Sınıf Matematik", grade: 10, topics: 21, yks: 0.6 },
    { key: "matematik", name: "11. Sınıf Matematik", grade: 11, topics: 15, yks: 0.5 },
    { key: "fizik", name: "11. Sınıf Fizik", grade: 11, topics: 16, yks: 0.4 },
    { key: "edebiyat", name: "11. Sınıf Edebiyat", grade: 11, topics: 14, yks: 0.2 },
  ],
}

export function maarifInput(track: MaarifTrack, opts: { mastered?: boolean; weeklyMinutes?: number; schoolWeek?: number } = {}): MaarifRoadmapInput {
  const topics: MaarifTopicInput[] = []
  for (const s of MAARIF_SUBJECTS[track]) {
    for (let i = 0; i < s.topics; i++) {
      const week = Math.min(1 + Math.floor((i * 35) / s.topics), 36)
      // Ustalıklı öğrenci: geçmiş haftaların konularını iyi biliyor.
      const effective = opts.mastered && week < 6 ? 85 : opts.mastered && i % 4 === 0 ? 55 : 40
      topics.push({
        topic_id: `${s.name}-${i}`,
        topic_name: `${s.name} konu ${i + 1}`,
        subject_id: s.name,
        subject_name: s.name,
        ders_key: s.key,
        grade: s.grade,
        school_week: week,
        effective,
        assessment: opts.mastered && week < 6 ? "biliyorum" : null,
        yksValue: s.yks ? Math.round(s.yks * (1 - i / (s.topics * 2)) * 1000) / 1000 : 0,
      })
    }
  }
  return {
    track,
    today: TODAY,
    schoolWeek: opts.schoolWeek ?? 6,
    isExamWeek: false,
    weekStarts: WEEK_STARTS,
    horizon: SCHOOL_END,
    weeklyMinutes: opts.weeklyMinutes ?? 480,
    availableWeeklyMinutes: opts.weeklyMinutes ?? 480,
    minutesPerQuestion: 1.5,
    topics,
    existing: [],
    completedTopicIds: [],
    edges: [],
  }
}

export const maarifRoadmap = (track: MaarifTrack, opts?: Parameters<typeof maarifInput>[1]) => buildMaarifRoadmap(maarifInput(track, opts))

// ── YKS (eski_12 / mezun) ───────────────────────────────────────────────
const YKS_SUBJECTS: { name: string; topics: number; weight: number; coef: number }[] = [
  { name: "TYT Türkçe", topics: 10, weight: 4, coef: 1.2 },
  { name: "TYT Matematik", topics: 15, weight: 2, coef: 1.39 },
  { name: "TYT Din Kültürü", topics: 5, weight: 1, coef: 1.27 },
  { name: "TYT Tarih", topics: 6, weight: 0.8, coef: 1.27 },
  { name: "TYT Fizik", topics: 6, weight: 1.2, coef: 1.07 },
  { name: "AYT Matematik", topics: 12, weight: 2.5, coef: 2.89 },
  { name: "AYT Fizik", topics: 10, weight: 1.4, coef: 2.46 },
]

export function yksInput(opts: { mastered?: boolean; weeklyMinutes?: number; targetRanking?: number | null; track?: "eski_12" | "mezun" } = {}): RoadmapInput {
  const topics: RoadmapTopicInput[] = []
  for (const s of YKS_SUBJECTS) {
    for (let i = 0; i < s.topics; i++) {
      topics.push({
        topic_id: `${s.name}-${i}`,
        topic_name: `${s.name} ${i + 1}`,
        subject_id: s.name,
        subject_name: s.name,
        weight: s.weight,
        weightEstimated: false,
        coefficient: s.coef,
        effective: opts.mastered && i % 3 === 0 ? 80 : 40,
        assessment: opts.mastered && i % 3 === 0 ? "biliyorum" : null,
        examWrongs: 0,
        netGap: 1,
        gapAtom: null,
      })
    }
  }
  // AYT Matematik konuları TYT Matematik'in ilk konusuna bağlı (konu bazlı ön koşul).
  const edges = Array.from({ length: 12 }, (_, i) => ({ prereq: "TYT Matematik-0", topic: `AYT Matematik-${i}` }))
  return {
    today: TODAY,
    examDate: YKS_2027,
    weeklyMinutes: opts.weeklyMinutes ?? 1200,
    availableWeeklyMinutes: opts.weeklyMinutes ?? 1200,
    minutesPerQuestion: 1.5,
    topics,
    existing: [],
    completedTopicIds: [],
    edges,
    puanTuru: "SAY",
    gateMode: "topic",
    targetRanking: opts.targetRanking ?? 25000,
    track: opts.track ?? "mezun",
  }
}

export const yksRoadmap = (opts?: Parameters<typeof yksInput>[0]) => buildRoadmap(yksInput(opts))
