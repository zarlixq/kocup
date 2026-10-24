import { ACTIVE_TOPICS_RANGE, MAX_ACTIVE_PER_SUBJECT, MAX_LEARNING_ACTIVE, UPPLAN_SQL_CONFIG, UPPLAN_TRACK_SQL_CONFIG as C } from "@/lib/upplan/config"
import {
  acyclicEdges,
  activeSlotsFor,
  addDaysIso,
  blockTypeFor,
  daysBetweenIso,
  learningPhaseFor,
  needMinutes,
  simulatePlan,
  type Edge,
  type ExistingGoal,
  type Roadmap,
  type RoadmapItem,
  type RoadmapItemStatus,
  type SimEntry,
} from "@/lib/upplan/roadmap"
import { GOAL_TEMPLATES, LECTURE_MINUTES } from "@/lib/upplan/config"

// UpPlan Maarif yol haritası (9, 10, 11) — saf fonksiyon, LLM yok.
//
// OKUL TAKİBİ: konu havuzu öğrencinin sınıfının Maarif konuları (+ alt sınıflardan
//   eksik kapatma). Her konunun okul haftası (topics.school_week) var:
//     işlendi (hafta ≤ bugünkü okul haftası)      → pekiştir; açığı büyükse hemen
//     yakında (≤ school_ahead_weeks hafta sonra)  → önden git
//     ileride                                     → okulda işlenmeden ~2 hafta önce açılır
// ÖNCELİK = w_school × okul haftası yakınlığı + w_gap × ustalık açığı
//           (+ 11: w_yks × eşlenen TYT/AYT konusunun sınav değeri, topic_yks_map)
//           × yazılı haftası çarpanı (işlenmiş okul konusu) × öğrenci hedefi bonusu
// SINAV DİLİ: 9-10'da program metinlerinde YKS/TYT/AYT geçmez.
// TAKVİM: ortak çekirdek simulatePlan (aktif konu sınırı, ön koşul) — ufuk ders yılı sonu.

export type MaarifTrack = "maarif_9" | "maarif_10" | "maarif_11"

export type MaarifTopicInput = {
  topic_id: string
  topic_name: string
  subject_id: string
  subject_name: string
  ders_key: string | null
  /** Konunun sınıfı (9, 10, 11). */
  grade: number
  /** Yıllık plandaki okul haftası. */
  school_week: number
  effective: number
  assessment: "hic_gormedim" | "eksik" | "biliyorum" | null
  /** 11: eşlenen YKS konularının sınav değeri (Σ güç × soru × katsayı); 0..1'e normalize edilir. */
  yksValue?: number
  /** Öğrencinin/koçun eklediği ya da feda listesinden geri alınan konu. */
  userGoal?: boolean
  /** 10. sınıf alan eğilimi: bu dersin ağırlığı hafif artar. */
  egilimBonus?: number
  /** Öğrenci geri bildirimi cezası (ör. "sıkıcı"), 0..1 çarpan. */
  feedbackFactor?: number
}

export type MaarifRoadmapInput = {
  track: MaarifTrack
  today: string
  /** Bugünkü okul haftası (tatildeyse son biten; yıl başlamadıysa 0). */
  schoolWeek: number
  isExamWeek: boolean
  /** Okul haftası numarası → haftanın Pazartesi'si. */
  weekStarts: Map<number, string>
  /** Plan ufku: ders yılı sonu. */
  horizon: string
  weeklyMinutes: number
  availableWeeklyMinutes: number
  minutesPerQuestion: number
  topics: MaarifTopicInput[]
  existing: ExistingGoal[]
  completedTopicIds: string[]
  edges: Edge[]
}

const round = (v: number, d = 3) => Math.round(v * 10 ** d) / 10 ** d

/** Okul haftası yakınlığı (0..1): işlenmiş konu uzaklaştıkça azalır, yakındaki konu 1, ileridekiler 0. */
export function schoolProximity(topicWeek: number, schoolWeek: number): number {
  const dw = topicWeek - schoolWeek
  if (dw > C.school_ahead_weeks) return 0
  if (dw > 0) return 1
  return round(1 / (1 + Math.abs(dw) / C.school_proximity_decay_weeks))
}

export type MaarifPhase = "islendi" | "yakinda" | "ileride" | "eksik_kapatma"

export function maarifPhase(t: Pick<MaarifTopicInput, "grade" | "school_week">, ownGrade: number, schoolWeek: number): MaarifPhase {
  if (t.grade < ownGrade) return "eksik_kapatma"
  const dw = t.school_week - schoolWeek
  if (dw <= 0) return "islendi"
  return dw <= C.school_ahead_weeks ? "yakinda" : "ileride"
}

export function maarifPriority(
  t: MaarifTopicInput,
  opts: { ownGrade: number; schoolWeek: number; isExamWeek: boolean; withYks: boolean },
): number {
  const phase = maarifPhase(t, opts.ownGrade, opts.schoolWeek)
  const gap = Math.max(UPPLAN_SQL_CONFIG.label_iyi - t.effective, 0) / UPPLAN_SQL_CONFIG.label_iyi
  // Alt sınıf konusu okul takviminde değil; eksiği ölçüsünde yarım yakınlıkla girer.
  const prox = phase === "eksik_kapatma" ? C.maarif_lower_grade_proximity * gap : schoolProximity(t.school_week, opts.schoolWeek)
  let p = C.maarif_w_school * prox + C.maarif_w_gap * gap + (opts.withYks ? C.maarif_w_yks * (t.yksValue ?? 0) : 0)
  if (opts.isExamWeek && phase === "islendi") p *= C.exam_week_school_weight
  if (t.userGoal) p *= C.user_goal_bonus
  p *= t.egilimBonus ?? 1
  p *= t.feedbackFactor ?? 1
  return round(p)
}

const OWN_GRADE: Record<MaarifTrack, number> = { maarif_9: 9, maarif_10: 10, maarif_11: 11 }

function reasonFor(t: MaarifTopicInput, phase: MaarifPhase, track: MaarifTrack, schoolWeek: number): string[] {
  const out: string[] = []
  const eff = Math.round(t.effective)
  if (phase === "islendi") {
    const ago = schoolWeek - t.school_week
    out.push(ago === 0 ? `Bu hafta okulda işleniyor; pekiştir (ustalığın ${eff})` : `Okulda ${ago} hafta önce işlendi; ustalığın ${eff}, pekiştir`)
  } else if (phase === "yakinda") {
    out.push(`Okulda ${t.school_week - schoolWeek} hafta sonra işlenecek: önden git`)
  } else if (phase === "ileride") {
    out.push(`Okulda ${t.school_week}. haftada işlenecek; ondan ${C.school_ahead_weeks} hafta önce başlar`)
  } else {
    out.push(`${t.grade}. sınıftan eksik konu (ustalığın ${eff}): kapat`)
  }
  if (track === "maarif_11" && (t.yksValue ?? 0) >= C.yks_value_reason_min) out.push("YKS 2028'de soru değeri yüksek bir konuyla ilişkili")
  if (t.userGoal) out.push("Kendi eklediğin konu: önceliğine bonus")
  return out
}

export function maarifOverflowMessage(track: MaarifTrack, n: number): string {
  if (track === "maarif_11")
    return `Bu tempoyla ${n} konuyu bu ders yılı içinde pekiştiremiyorsun; önce okulda işlediklerin ve YKS 2028'e en çok katkı sağlayanlar planda. Haftalık saatini artırırsan diğerleri de girer.`
  return `Okul konularından ${n} tanesi bu dönem programa sığmıyor; önce okulda işlediğin ve eksik kalan konuları pekiştiriyoruz. Haftalık çalışma saatini artırırsan bunlar da plana girer.`
}

export function buildMaarifRoadmap(input: MaarifRoadmapInput): Roadmap & { track: MaarifTrack; schoolWeek: number } {
  const ownGrade = OWN_GRADE[input.track]
  const withYks = input.track === "maarif_11"
  const completed = new Set(input.completedTopicIds)
  const notes: string[] = []
  const slots = activeSlotsFor(input.weeklyMinutes)

  const humanGoal = new Set(input.existing.filter((e) => e.source !== "ai").map((e) => e.topic_id))
  const pool = input.topics.filter((t) => !completed.has(t.topic_id))
  // Alt sınıf konusu yalnız açığı varsa (iyi bilinen eski konu plana girmez).
  const relevant = pool.filter((t) => t.grade === ownGrade || t.effective < UPPLAN_SQL_CONFIG.label_iyi || humanGoal.has(t.topic_id) || t.userGoal)
  const byId = new Map(relevant.map((t) => [t.topic_id, t]))
  const { edges, broken } = acyclicEdges(input.edges, new Set(byId.keys()))
  if (broken.length) notes.push(`${broken.length} ön koşul döngüsü kırıldı.`)
  const prereqsOf = new Map<string, string[]>()
  for (const e of edges) (prereqsOf.get(e.topic) ?? prereqsOf.set(e.topic, []).get(e.topic)!).push(e.prereq)

  const prio = new Map<string, number>()
  for (const t of relevant)
    prio.set(t.topic_id, maarifPriority({ ...t, userGoal: t.userGoal || humanGoal.has(t.topic_id) }, { ownGrade, schoolWeek: input.schoolWeek, isExamWeek: input.isExamWeek, withYks }))

  // Okul konusu, okulda işlenmeden school_ahead_weeks hafta önce açılır.
  const notBeforeOf = (t: MaarifTopicInput): string | null => {
    if (t.grade < ownGrade) return null
    const wk = t.school_week - C.school_ahead_weeks
    if (wk <= input.schoolWeek) return null
    const d = input.weekStarts.get(wk)
    return d && d > input.today ? d : null
  }

  const goal = (t: MaarifTopicInput) => {
    const bt = blockTypeFor(t.effective)
    const phase = learningPhaseFor(t.assessment, t.effective)
    const q = Math.max(20, Math.round(GOAL_TEMPLATES[bt].questions / 10) * 10)
    return { bt, phase, q, acc: GOAL_TEMPLATES[bt].accuracy, need: needMinutes(bt, q, input.minutesPerQuestion, phase) }
  }

  const existingByTopic = new Map(input.existing.filter((e) => e.source !== "ai" || e.progressed).map((e) => [e.topic_id, e]))
  const fixed = relevant.filter((t) => existingByTopic.has(t.topic_id)).map((t) => t.topic_id)
  // Sıra: açılış tarihi (okul takvimi), sonra öncelik.
  const queue = relevant
    .filter((t) => !existingByTopic.has(t.topic_id))
    .sort((a, b) => (notBeforeOf(a) ?? "").localeCompare(notBeforeOf(b) ?? "") || prio.get(b.topic_id)! - prio.get(a.topic_id)! || a.topic_id.localeCompare(b.topic_id))
    .map((t) => t.topic_id)

  const simEntry = (id: string, need: number): SimEntry => {
    const t = byId.get(id)!
    const nb = notBeforeOf(t)
    return {
      id,
      need,
      subject: t.subject_id,
      learnMinutes: goal(t).phase === "gerekli" ? LECTURE_MINUTES : 0,
      prereqs: (prereqsOf.get(id) ?? []).filter((p) => (byId.get(p)?.effective ?? 0) < UPPLAN_SQL_CONFIG.label_iyi),
      gate: [],
      ...(nb ? { notBefore: nb } : {}),
    }
  }
  const sim = simulatePlan(
    queue.map((id) => simEntry(id, goal(byId.get(id)!).need)),
    {
      start: input.today,
      weeklyMinutes: input.weeklyMinutes,
      slots: Math.min(Math.max(slots, ACTIVE_TOPICS_RANGE.min), ACTIVE_TOPICS_RANGE.max),
      horizon: input.horizon,
      forceStart: input.horizon,
      maxPerSubject: MAX_ACTIVE_PER_SUBJECT,
      maxLearning: MAX_LEARNING_ACTIVE,
      preActive: fixed.map((id) => ({ ...simEntry(id, existingByTopic.get(id)!.remainingMinutes), prereqs: [], notBefore: undefined })),
    },
  )

  const items: RoadmapItem[] = []
  let overflow = 0
  const ordered = [
    ...[...fixed].sort((a, b) => prio.get(b)! - prio.get(a)!),
    ...queue.sort((a, b) => (sim.get(a)?.start ?? "9999").localeCompare(sim.get(b)?.start ?? "9999") || prio.get(b)! - prio.get(a)!),
  ]
  for (const id of ordered) {
    const t = byId.get(id)!
    const g = goal(t)
    const ex = existingByTopic.get(id) ?? null
    const s = sim.get(id)
    const phase = maarifPhase(t, ownGrade, input.schoolWeek)
    let status: RoadmapItemStatus
    if (ex) status = "aktif"
    else if (!s?.start || !s.end) status = "zaman_kalirsa"
    else status = s.start === input.today ? "aktif" : "sirada"
    if (status === "zaman_kalirsa") overflow += 1
    const start = ex ? input.today : (s?.start ?? input.horizon)
    const end = ex ? ex.son_tarih : (s?.end ?? input.horizon)
    items.push({
      topic_id: id,
      topic_name: t.topic_name,
      subject_id: t.subject_id,
      subject_name: t.subject_name,
      score: round(prio.get(id)!, 2),
      block_type: g.bt,
      target_questions: g.q,
      target_accuracy: g.acc,
      need_minutes: g.need,
      wave: s?.start ? Math.floor(daysBetweenIso(input.today, s.start) / 7) + 1 : ex ? 1 : 0,
      plan_order: items.length + 1,
      start,
      end: end < start ? start : end,
      status,
      reasons: [...reasonFor(t, phase, input.track, input.schoolWeek), ...(ex ? [ex.source === "coach" ? "Koçundan devralınan hedef" : "Kendi eklediğin hedef"] : [])],
      prereqs: prereqsOf.get(id) ?? [],
      existing: ex ? { assignment_id: ex.assignment_id, source: ex.source } : null,
      learning_phase: g.phase,
      gate: [],
      efficiency: prio.get(id)!,
      priority: prio.get(id)!,
    })
  }
  const lastWave = Math.max(1, ...items.map((i) => i.wave))
  for (const it of items) if (it.wave === 0) it.wave = lastWave + 1

  if (input.track === "maarif_11") notes.push("Haftada bir bağlam temelli soru bloğu planlanır (YKS 2028 soru tipi).")
  if (input.track !== "maarif_11") notes.push("Program okul müfredatını takip eder: işlenen konuları pekiştirir, bir iki hafta önden gider.")

  // Ders bazlı saat (planlanan konular).
  const bySubject = new Map<string, { subject_id: string; subject_name: string; minutes: number }>()
  for (const it of items) {
    if (it.status === "zaman_kalirsa") continue
    const cur = bySubject.get(it.subject_id) ?? { subject_id: it.subject_id, subject_name: it.subject_name, minutes: 0 }
    cur.minutes += it.need_minutes
    bySubject.set(it.subject_id, cur)
  }
  const planWeeks = Math.max(daysBetweenIso(input.today, input.horizon), 7) / 7
  const totalNeed = items.reduce((n, i) => n + i.need_minutes, 0)
  return {
    track: input.track,
    schoolWeek: input.schoolWeek,
    today: input.today,
    examDate: input.horizon,
    examPeriodStart: input.horizon,
    weeklyMinutes: input.weeklyMinutes,
    activeSlots: slots,
    minutesPerQuestion: input.minutesPerQuestion,
    items,
    overflow: overflow > 0 ? { count: overflow, message: maarifOverflowMessage(input.track, overflow) } : null,
    brokenCycles: broken,
    notes,
    subjectHours: Array.from(bySubject.values())
      .map((h) => ({ subject_id: h.subject_id, subject_name: h.subject_name, hours: Math.round(h.minutes / 60) }))
      .filter((h) => h.hours > 0)
      .sort((a, b) => b.hours - a.hours),
    weeklyHours: {
      current: Math.round(input.availableWeeklyMinutes / 60),
      required: Math.ceil(totalNeed / planWeeks / 60),
      steps: [],
    },
  }
}

/** Okul haftası → tarih eşlemesi (school_calendar_weeks). */
export function weekStartsMap(weeks: { week_no: number; starts_on: string }[]): Map<number, string> {
  return new Map(weeks.map((w) => [w.week_no, w.starts_on]))
}

/** Ders yılı sonu (son okul haftasının Cuma'sı). */
export function schoolYearEnd(weeks: { week_no: number; starts_on: string }[], fallback: string): string {
  const last = weeks.reduce<{ week_no: number; starts_on: string } | null>((a, w) => (!a || w.week_no > a.week_no ? w : a), null)
  return last ? addDaysIso(last.starts_on, 4) : fallback
}
