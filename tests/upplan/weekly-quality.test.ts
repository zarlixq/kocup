import { describe, expect, it } from "vitest"
import { UPPLAN_TRACK_SQL_CONFIG as C } from "@/lib/upplan/config"
import { fromHHMM, scheduleWeek, weekRulesFor, type DraftItem, type ProgramGoal, type ScheduleInput } from "@/lib/upplan/scheduler"
import { coreSubjectId, heavySubjectIds, lowValueSubjectIds, skeletonFor, subjectWeightsFor, type SubjectInfo } from "@/lib/upplan/week-skeleton"
import { AVAIL_MEZUN, AVAIL_STUDENT, WEEK } from "@/tests/upplan/fixtures"
import { kindOf, summarizeWeek } from "@/tests/upplan/week-summary"

// Faz C2 — haftalık program kalitesi invariant'ları (kurucu profiline benzer sayısal mezun).

const SUBJECTS: SubjectInfo[] = [
  { id: "tyt-tr", name: "TYT Türkçe", ders_key: null, exam_type: "tyt" },
  { id: "tyt-mat", name: "TYT Matematik", ders_key: null, exam_type: "tyt" },
  { id: "tyt-din", name: "TYT Din Kültürü", ders_key: null, exam_type: "tyt" },
  { id: "tyt-tar", name: "TYT Tarih", ders_key: null, exam_type: "tyt" },
  { id: "tyt-fiz", name: "TYT Fizik", ders_key: null, exam_type: "tyt" },
  { id: "ayt-mat", name: "AYT Matematik", ders_key: null, exam_type: "ayt" },
  { id: "ayt-fiz", name: "AYT Fizik", ders_key: null, exam_type: "ayt" },
]
const names = new Map(SUBJECTS.map((s) => [s.id, s.name]))
const LOW = ["tyt-din", "tyt-tar"]

const goal = (id: string, subject: string, over: Partial<ProgramGoal> = {}): ProgramGoal => ({
  assignment_id: `a-${id}`,
  topic_id: `t-${id}`,
  topic_name: id,
  subject_id: subject,
  subject_name: names.get(subject) ?? subject,
  block_type: "soru_cozum",
  remaining_questions: 120,
  lecture_pending: false,
  son_tarih: "2026-11-30",
  scheduled_blocks: 0,
  priority: 0.5,
  reason: `${id}: gerekçe`,
  ...over,
})

function mezunInput(): ScheduleInput {
  const goals: ProgramGoal[] = [
    goal("Temel Kavramlar", "tyt-mat", { priority: 2.2 }),
    goal("Fonksiyonlar", "ayt-mat", { priority: 0.7, lecture_pending: true, block_type: "konu_calisma" }),
    goal("Limit", "ayt-mat", { priority: 0.7, lecture_pending: true, block_type: "konu_calisma" }),
    goal("Sözcükte Anlam", "tyt-tr", { priority: 0.53, lecture_pending: true, block_type: "konu_calisma" }),
    goal("Vektörler", "ayt-fiz", { priority: 0.4 }),
    goal("Hz. Muhammed'in Hayatı", "tyt-din", { priority: 0.23, short_review_pending: true }),
    goal("İslam'ın Temel Kaynakları", "tyt-din", { priority: 0.22 }),
    goal("Biyoloji (kendi hedefi)", "tyt-fiz", { priority: 0.07, user_goal: true }),
  ]
  const practice = [
    { key: "paragraf", label: "Paragraf", subject_id: "tyt-tr", blocks: 3, questionsPerBlock: 20, topics: [{ assignment_id: "p1", topic_id: "par", topic_name: "Paragraf" }] },
    { key: "problemler", label: "Problemler", subject_id: "tyt-mat", blocks: 2, questionsPerBlock: 20, topics: [{ assignment_id: "p2", topic_id: "prob", topic_name: "Sayı Problemleri" }] },
  ]
  const avg = new Map(SUBJECTS.map((s) => [s.id, 40]))
  return {
    weekStart: WEEK,
    today: WEEK,
    availability: AVAIL_MEZUN,
    focusMinutes: 90,
    loadFactor: 1,
    segment: "yks",
    weeksLeft: 33,
    minutesPerQuestion: 1.5,
    goals,
    reviews: [{ topic_id: "t-ciftler", topic_name: "Tek ve Çift Sayılar", subject_id: "tyt-mat", subject_name: "TYT Matematik", due: "2026-10-28", reason: "aralikli" }],
    fixed: [],
    videoDays: [
      { day_of_week: 1, minutes: 12, subject_id: "tyt-tr", label: "Türkçe Kampı (1 video)", topic_ids: ["t-Sözcükte Anlam"] },
      { day_of_week: 2, minutes: 14, subject_id: "tyt-tr", label: "Türkçe Kampı (1 video)", topic_ids: [] },
      { day_of_week: 4, minutes: 60, subject_id: "tyt-mat", label: "Matematik Kampı (2 video)", topic_ids: ["t-Temel Kavramlar"] },
    ],
    rules: weekRulesFor({
      track: "mezun",
      schoolDays: [],
      holiday: false,
      skeleton: skeletonFor({ track: "mezun", alan: "sayisal", schoolWeek: 0, contextExam: false, practice, paragrafSubjectId: "tyt-tr", problemSubjectId: "tyt-mat" }),
      lowValueSubjects: lowValueSubjectIds(SUBJECTS, "sayisal", "mezun"),
      heavySubjects: heavySubjectIds(SUBJECTS),
      coreSubjectId: coreSubjectId(SUBJECTS, "sayisal", "mezun"),
    }),
    subjectWeights: subjectWeightsFor(SUBJECTS, avg, "SAY", 25000),
  }
}

const mins = (i: DraftItem) => fromHHMM(i.end_time) - fromHHMM(i.start_time)

describe("C2: sayısal mezun haftası", () => {
  const r = scheduleWeek(mezunInput())
  const sum = summarizeWeek(r.items, names)
  const study = sum.totalMinutes

  it("alan dışı ders kuralları config'ten (Din, Tarih)", () => {
    expect(lowValueSubjectIds(SUBJECTS, "sayisal", "mezun").sort()).toEqual([...LOW].sort())
  })

  it("AYT Matematik > 0 ve haftada en az ayt_core_min_days gün", () => {
    const ayt = r.items.filter((i) => i.subject_id === "ayt-mat")
    expect(ayt.reduce((n, i) => n + mins(i), 0)).toBeGreaterThan(0)
    expect(new Set(ayt.map((i) => i.day_of_week)).size).toBeGreaterThanOrEqual(C.ayt_core_min_days)
  })

  it("Din + Felsefe + Tarih + Coğrafya ≤ %8 ve kısa bloklar", () => {
    const low = r.items.filter((i) => i.subject_id && LOW.includes(i.subject_id))
    expect(low.reduce((n, i) => n + mins(i), 0)).toBeLessThanOrEqual(C.lowvalue_cap_ratio * study)
    for (const b of low) expect(mins(b)).toBeLessThanOrEqual(C.lowvalue_block_max)
  })

  it("her konu bloğunu 48 saat içinde aynı konunun soru bloğu izliyor", () => {
    const konu = r.items.filter((i) => i.block_type === "konu_calisma" && kindOf(i) === "konu")
    expect(konu.length).toBeGreaterThan(0)
    for (const k of konu) {
      const after = r.items.filter(
        (i) =>
          i.topic_id === k.topic_id &&
          i.block_type !== "konu_calisma" &&
          i.day_of_week - k.day_of_week <= C.konu_soru_max_gap_days &&
          (i.day_of_week > k.day_of_week || i.start_time >= k.end_time),
      )
      expect(after.length, `${k.baslik} sonrası soru yok`).toBeGreaterThan(0)
    }
  })

  it("deneme sonrası (ertesi gün) analiz bloğu var", () => {
    const exam = r.items.find((i) => i.block_type === "deneme")!
    const analysis = r.items.find((i) => i.baslik.startsWith("Deneme analizi"))!
    expect(analysis.day_of_week).toBe(Math.min(exam.day_of_week + 1, 7))
    expect(mins(analysis)).toBe(C.exam_analysis_minutes)
  })

  it("kısa tekrar ≤ 30 dk; soru bloğunda hedef soru dolu", () => {
    for (const t of r.items.filter((i) => kindOf(i) === "tekrar")) expect(mins(t)).toBeLessThanOrEqual(C.short_review_minutes)
    for (const s of r.items.filter((i) => i.block_type === "soru_cozum")) expect(s.hedef_soru).toBeGreaterThan(0)
  })

  it("süre oranları: konu ≤ %40, soru ≥ %45, tekrar+analiz ≥ %15", () => {
    expect(sum.shares.konu).toBeLessThanOrEqual(C.ratio_konu_max + 0.005)
    expect(sum.shares.soru).toBeGreaterThanOrEqual(C.ratio_soru_min - 0.005)
    expect(sum.shares.tekrarAnaliz).toBeGreaterThanOrEqual(C.ratio_tekrar_min - 0.005)
    expect(r.meta.warnings).toEqual([])
  })

  it("günlük iskelet: her gün problem + paragraf", () => {
    for (const d of [1, 2, 3, 4, 5, 6, 7]) {
      const day = r.items.filter((i) => i.day_of_week === d)
      if (!day.length) continue
      expect(day.some((i) => i.baslik.startsWith("Paragraf soruları"))).toBe(true)
      expect(day.some((i) => i.baslik.startsWith("Problem soruları"))).toBe(true)
    }
  })

  it("video: 20 dk altı parça yok, ders başına günde en fazla 1 video", () => {
    const videos = r.items.filter((i) => i.baslik.startsWith("Video:"))
    for (const v of videos) expect(mins(v)).toBeGreaterThanOrEqual(C.video_min_chunk_minutes)
    const perDay = new Map<string, number>()
    for (const v of videos) perDay.set(`${v.day_of_week}:${v.subject_id}`, (perDay.get(`${v.day_of_week}:${v.subject_id}`) ?? 0) + 1)
    expect(Math.max(0, ...perDay.values())).toBeLessThanOrEqual(1)
  })

  it("aynı ders günde ≤ 2 blok (iskelet hariç); ağır sayısal bloklar günün ilk yarısında", () => {
    const counted = r.items.filter((i) => !i.baslik.startsWith("Paragraf soruları") && !i.baslik.startsWith("Problem soruları") && i.subject_id)
    const per = new Map<string, number>()
    for (const i of counted) per.set(`${i.day_of_week}:${i.subject_id}`, (per.get(`${i.day_of_week}:${i.subject_id}`) ?? 0) + 1)
    expect(Math.max(...per.values())).toBeLessThanOrEqual(2)
    for (const i of r.items.filter((x) => x.subject_id === "ayt-mat")) {
      // Müsaitlik 19:30-23:30: ağır blok 21:30'dan (günün ortası) önce başlar.
      expect(fromHHMM(i.start_time)).toBeLessThan(fromHHMM("21:30"))
    }
  })

  it("kullanıcı hedefi bonus alır ama sırayı ezmez: en az 1 blok, en öncelikliden az", () => {
    const own = r.items.filter((i) => i.topic_id === "t-Biyoloji (kendi hedefi)")
    const top = r.items.filter((i) => i.topic_id === "t-Temel Kavramlar")
    expect(own.length).toBeGreaterThanOrEqual(1)
    expect(own.reduce((n, i) => n + mins(i), 0)).toBeLessThanOrEqual(top.reduce((n, i) => n + mins(i), 0))
  })

  it("her blokta 'neden bu blok?' gerekçesi", () => {
    expect(r.items.every((i) => (i.neden ?? "").length > 5)).toBe(true)
  })
})

describe("Maarif haftaları", () => {
  const base9 = (): ScheduleInput => ({
    weekStart: WEEK,
    today: WEEK,
    availability: AVAIL_STUDENT,
    focusMinutes: 45,
    loadFactor: 1,
    segment: "yks",
    weeksLeft: 160,
    minutesPerQuestion: 1.5,
    goals: [
      goal("Doğrusal Fonksiyonlar", "m9", { subject_name: "9. Sınıf Matematik", lecture_pending: true, priority: 1.4 }),
      goal("Vektörler", "f9", { subject_name: "9. Sınıf Fizik", priority: 1.2 }),
      goal("Hikâye", "e9", { subject_name: "9. Sınıf Edebiyat", priority: 1 }),
    ],
    reviews: [],
    fixed: [],
    rules: weekRulesFor({
      track: "maarif_9",
      schoolDays: [1, 2, 3, 4, 5],
      holiday: false,
      skeleton: skeletonFor({ track: "maarif_9", alan: null, schoolWeek: 7, contextExam: false, practice: [], paragrafSubjectId: "tr", problemSubjectId: "mat" }),
    }),
  })

  it("9. sınıf: deneme yok, okul günü ≤ 2 saat, haftada bir boş gün, sınav adı geçmez", () => {
    const r = scheduleWeek(base9())
    expect(r.items.some((i) => i.block_type === "deneme")).toBe(false)
    for (const d of [1, 2, 3, 4, 5]) {
      const total = r.items.filter((i) => i.day_of_week === d).reduce((n, i) => n + mins(i), 0)
      expect(total).toBeLessThanOrEqual(C.limit_maarif_9_school_day_max_min)
    }
    expect([1, 2, 3, 4, 5, 6, 7].some((d) => r.items.every((i) => i.day_of_week !== d))).toBe(true)
    for (const i of r.items) expect(`${i.baslik} ${i.neden}`).not.toMatch(/\b(YKS|TYT|AYT)\b/)
  })

  it("11. sınıf: haftalık bağlam temelli soru bloğu", () => {
    const r = scheduleWeek({
      ...base9(),
      rules: weekRulesFor({
        track: "maarif_11",
        schoolDays: [1, 2, 3, 4, 5],
        holiday: false,
        skeleton: skeletonFor({ track: "maarif_11", alan: "sayisal", schoolWeek: 7, contextExam: false, practice: [], paragrafSubjectId: "tr", problemSubjectId: "mat" }),
      }),
    })
    expect(r.items.some((i) => i.baslik === "Bağlam temelli sorular")).toBe(true)
  })

  it("yarıyıl tatilinde yük artar", () => {
    const school = scheduleWeek(base9())
    const holiday = scheduleWeek({ ...base9(), rules: { ...base9().rules, schoolDays: [], holidayMultiplier: C.holiday_load_multiplier } })
    expect(holiday.meta.studyMinutes).toBeGreaterThanOrEqual(school.meta.studyMinutes)
  })
})
