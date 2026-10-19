import {
  ACTIVE_TOPICS_RANGE,
  CAPACITY_UTILIZATION,
  COMPLETION_MASTERY,
  DEFAULT_MINUTES_PER_QUESTION,
  EXAM_PERIOD_WEEKS,
  GAP_MULTIPLIER,
  GOAL_TEMPLATES,
  LECTURE_MINUTES,
  MAX_ACTIVE_PER_SUBJECT,
  MINUTES_PER_QUESTION_RANGE,
  MIN_TIMED_QUESTIONS,
  MIN_WEEKLY_MINUTES_PER_ACTIVE,
  NET_GAP_STRENGTH,
  PACE_TOLERANCE,
  PRACTICE_EXAMS_PER_WEEK,
  PRACTICE_EXAM_MINUTES,
  UPPLAN_SQL_CONFIG,
  type BlockType,
} from "@/lib/upplan/config"

// UpPlan yol haritası — saf fonksiyonlar (LLM yok, test edilir).
//
// PUAN   = sınav ağırlığı × (100 − etkili ustalık)/100 × ders net açığı × açık çarpanı
// SIRA   = ön koşul grafı (topolojik) + puan; ön koşul, kendisine bağlı konuların
//          en yüksek puanını devralır (önce açılsın diye)
// DALGA  = aynı anda K aktif konu (4-8, kapasiteye göre); dalga süresi =
//          dalgadaki konuların toplam süre ihtiyacı / haftalık kapasite
// SINIR  = sınavdan önceki son 6 hafta deneme dönemi; oraya taşan konular "zaman kalırsa"

export type Segment = "yks" | "lgs"

// ── Yardımcılar ─────────────────────────────────────────────────────────
const DAY_MS = 86_400_000

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function daysBetweenIso(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS)
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const round1 = (v: number) => Math.round(v * 10) / 10

/** Hedef şablonu etkili ustalığa göre (zayıf → konu çalışması, gelişiyor → soru çözümü, iyi → tekrar). */
export function blockTypeFor(effective: number): BlockType {
  if (effective < UPPLAN_SQL_CONFIG.label_gelisiyor) return "konu_calisma"
  if (effective < UPPLAN_SQL_CONFIG.label_iyi) return "soru_cozum"
  return "tekrar"
}

/** Hedef tamamlandı mı: soru hedefi doldu VE etkili ustalık eşik üstü. */
export function isGoalComplete(solved: number, targetQuestions: number | null, effective: number): boolean {
  return (targetQuestions === null || solved >= targetQuestions) && effective >= COMPLETION_MASTERY
}

/** Öğrencinin gerçek soru başı süresi (süreli kayıtlardan), yoksa varsayılan. */
export function minutesPerQuestion(sessions: { total_questions: number; duration_minutes: number | null }[]): number {
  let q = 0
  let m = 0
  for (const s of sessions) {
    if (s.duration_minutes && s.duration_minutes > 0 && s.total_questions > 0) {
      q += s.total_questions
      m += s.duration_minutes
    }
  }
  if (q < MIN_TIMED_QUESTIONS) return DEFAULT_MINUTES_PER_QUESTION
  return round1(clamp(m / q, MINUTES_PER_QUESTION_RANGE.min, MINUTES_PER_QUESTION_RANGE.max))
}

export function practiceExamsPerWeek(weeksLeft: number): number {
  for (const r of PRACTICE_EXAMS_PER_WEEK) if (weeksLeft >= r.minWeeksLeft) return r.perWeek
  return PRACTICE_EXAMS_PER_WEEK[PRACTICE_EXAMS_PER_WEEK.length - 1].perWeek
}

/** Haftalık konu çalışma kapasitesi (dk) = (müsait dk − deneme süresi) × kullanım × yük çarpanı. */
export function weeklyCapacityMinutes(opts: {
  availableMinutes: number
  segment: Segment
  weeksLeft: number
  loadFactor: number
}): number {
  const exams = practiceExamsPerWeek(opts.weeksLeft) * PRACTICE_EXAM_MINUTES[opts.segment]
  return Math.max(0, Math.round((opts.availableMinutes - exams) * CAPACITY_UTILIZATION * opts.loadFactor))
}

export function activeSlotsFor(weeklyMinutes: number): number {
  return clamp(Math.floor(weeklyMinutes / MIN_WEEKLY_MINUTES_PER_ACTIVE), ACTIVE_TOPICS_RANGE.min, ACTIVE_TOPICS_RANGE.max)
}

/** Bir konu hedefinin toplam süre ihtiyacı (dk). */
export function needMinutes(blockType: BlockType, questions: number, mpq: number): number {
  return Math.round(questions * mpq + (blockType === "konu_calisma" ? LECTURE_MINUTES : 0))
}

/**
 * Ders net açığı çarpanı: son denemelerde kaybedilen net oranı (0..1).
 * kayıp = 1 − ortalama net / ders soru sayısı. Deneme yoksa 1.
 */
export function netGapFactor(results: { correct: number; wrong: number; empty: number }[]): number {
  if (results.length === 0) return 1
  let lost = 0
  for (const r of results) {
    const total = r.correct + r.wrong + r.empty
    if (total <= 0) continue
    const net = r.correct - r.wrong / 4
    lost += clamp(1 - net / total, 0, 1)
  }
  return Math.round((1 + (lost / results.length) * NET_GAP_STRENGTH) * 100) / 100
}

export function priorityScore(t: { weight: number; effective: number; netGap: number; hasConfidentGap: boolean }): number {
  const raw = t.weight * ((100 - clamp(t.effective, 0, 100)) / 100) * t.netGap * (t.hasConfidentGap ? GAP_MULTIPLIER : 1)
  return Math.round(raw * 1000) / 1000
}

// ── Ön koşul grafı ──────────────────────────────────────────────────────
export type Edge = { prereq: string; topic: string }

/**
 * Atom ön koşullarından konu ön koşulu: atom A (konu T) ← ön koşul atom B (konu P), P≠T → P, T'nin ön koşulu.
 */
export function topicEdgesFromAtoms(
  atomPrereqs: { atom_id: string; prerequisite_atom_id: string }[],
  topicOfAtom: Map<string, string>,
): Edge[] {
  const seen = new Set<string>()
  const out: Edge[] = []
  for (const p of atomPrereqs) {
    const topic = topicOfAtom.get(p.atom_id)
    const prereq = topicOfAtom.get(p.prerequisite_atom_id)
    if (!topic || !prereq || topic === prereq) continue
    const k = `${prereq}>${topic}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push({ prereq, topic })
  }
  return out
}

/** Grafı verilen konulara kısıtlar ve döngüleri kırar (DFS geri kenarları atılır). */
export function acyclicEdges(edges: Edge[], nodes: Set<string>): { edges: Edge[]; broken: Edge[] } {
  const inSet = edges.filter((e) => nodes.has(e.prereq) && nodes.has(e.topic))
  const out = new Map<string, Edge[]>()
  for (const e of inSet) (out.get(e.prereq) ?? out.set(e.prereq, []).get(e.prereq)!).push(e)
  const state = new Map<string, 0 | 1 | 2>() // 1: yığında, 2: bitti
  const broken: Edge[] = []
  const keep: Edge[] = []
  const visit = (n: string) => {
    state.set(n, 1)
    for (const e of out.get(n) ?? []) {
      const s = state.get(e.topic) ?? 0
      if (s === 1) broken.push(e)
      else {
        keep.push(e)
        if (s === 0) visit(e.topic)
      }
    }
    state.set(n, 2)
  }
  for (const n of Array.from(nodes).sort()) if (!state.get(n)) visit(n)
  return { edges: keep, broken }
}

/** Kullanıcı sıralamasında ön koşulu kendisinden sonra gelen konular (uyarı; engellemez). */
export function prereqViolations(order: string[], edges: Edge[]): Edge[] {
  const pos = new Map(order.map((id, i) => [id, i]))
  return edges.filter((e) => {
    const a = pos.get(e.prereq)
    const b = pos.get(e.topic)
    return a !== undefined && b !== undefined && a > b
  })
}

// ── Girdi / çıktı ───────────────────────────────────────────────────────
export type RoadmapTopicInput = {
  topic_id: string
  topic_name: string
  subject_id: string
  subject_name: string
  /** Sınavdaki ortalama soru (topic_exam_weights ya da ders/konu tahmini). */
  weight: number
  weightEstimated: boolean
  effective: number
  assessment: "hic_gormedim" | "eksik" | "biliyorum" | null
  examWrongs: number
  netGap: number
  /** Açık haritasında güveni yeterli, yanlışı olan en büyük atom. */
  gapAtom: string | null
}

export type ExistingGoal = {
  assignment_id: string
  topic_id: string
  source: "student" | "coach" | "ai"
  /** Kalan süre ihtiyacı (dk). */
  remainingMinutes: number
  son_tarih: string
}

export type RoadmapItemStatus = "aktif" | "sirada" | "zaman_kalirsa"

export type RoadmapItem = {
  topic_id: string
  topic_name: string
  subject_id: string
  subject_name: string
  score: number
  block_type: BlockType
  target_questions: number
  target_accuracy: number
  need_minutes: number
  wave: number
  plan_order: number
  start: string
  end: string
  status: RoadmapItemStatus
  reasons: string[]
  prereqs: string[]
  /** Mevcut hedef (öğrencinin kendi / koçtan devralınan) — yol haritası onu değiştirmez. */
  existing: { assignment_id: string; source: ExistingGoal["source"] } | null
}

export type Roadmap = {
  today: string
  examDate: string
  examPeriodStart: string
  weeklyMinutes: number
  activeSlots: number
  minutesPerQuestion: number
  items: RoadmapItem[]
  overflow: { count: number; message: string } | null
  brokenCycles: { prereq: string; topic: string }[]
  notes: string[]
}

export type RoadmapInput = {
  today: string
  examDate: string
  weeklyMinutes: number
  minutesPerQuestion: number
  topics: RoadmapTopicInput[]
  existing: ExistingGoal[]
  /** Daha önce tamamlanmış konular (yol haritasına girmez). */
  completedTopicIds: string[]
  edges: Edge[]
}

export function overflowMessage(n: number): string {
  return `Bu tempoyla ${n} konuya yetişemiyorsun; haftalık saatini artır ya da bunları sona bırak.`
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ""
  return `${names.slice(0, -1).join(", ")} ve ${names[names.length - 1]}`
}

// ── Dalga zamanlaması (ilk kurulum, sıra değişikliği ve haftalık kaydırma ortak) ──
export type WaveEntry = { id: string; needMinutes: number; wave: number }

/** Sıralı kimlikleri K'lık dalgalara böler (ilk dalgada `firstWaveTaken` yer mevcut hedeflerce dolu). */
export function chunkWaves(ids: string[], slots: number, firstWaveTaken = 0): Map<string, number> {
  const out = new Map<string, number>()
  let wave = 1
  let count = firstWaveTaken
  for (const id of ids) {
    if (count >= slots) {
      wave += 1
      count = 0
    }
    out.set(id, wave)
    count += 1
  }
  return out
}

/**
 * Dalga tarihleri: dalga süresi = dalgadaki konuların süre ihtiyacı / günlük kapasite
 * (en az 1 hafta). 1. dalgaya mevcut aktif hedeflerin kalan yükü eklenir.
 * Toplam ihtiyaç plan sonuna (deneme dönemi başı) kadarki kapasiteyi aşınca fits=false.
 */
export function scheduleWaves(
  entries: WaveEntry[],
  opts: { weeklyMinutes: number; start: string; planEnd: string; startLoadMinutes?: number },
): Map<string, { wave: number; start: string; end: string; fits: boolean }> {
  const res = new Map<string, { wave: number; start: string; end: string; fits: boolean }>()
  const perDay = Math.max(opts.weeklyMinutes, 1) / 7
  const capacityTotal = Math.max(daysBetweenIso(opts.start, opts.planEnd), 0) * perDay
  const startLoad = opts.startLoadMinutes ?? 0
  const waves = Array.from(new Set(entries.map((e) => e.wave))).sort((a, b) => a - b)
  let used = startLoad
  let cursor = opts.start
  if (waves[0] !== undefined && waves[0] > 1 && startLoad > 0) cursor = addDaysIso(cursor, Math.ceil(startLoad / perDay))
  for (const w of waves) {
    const group = entries.filter((e) => e.wave === w)
    const load = group.reduce((sum, g) => sum + g.needMinutes, 0) + (w === 1 ? startLoad : 0)
    const end = addDaysIso(cursor, Math.max(Math.ceil(load / perDay), 7))
    for (const g of group) {
      used += g.needMinutes
      res.set(g.id, { wave: w, start: cursor, end: end > opts.planEnd ? opts.planEnd : end, fits: used <= capacityTotal })
    }
    cursor = end
  }
  return res
}

// ── Ana fonksiyon ───────────────────────────────────────────────────────
export function buildRoadmap(input: RoadmapInput): Roadmap {
  const examPeriodStart = addDaysIso(input.examDate, -EXAM_PERIOD_WEEKS * 7)
  const slots = activeSlotsFor(input.weeklyMinutes)
  const completed = new Set(input.completedTopicIds)
  const existingByTopic = new Map(input.existing.map((e) => [e.topic_id, e]))
  const notes: string[] = []

  const topics = input.topics.filter((t) => !completed.has(t.topic_id))
  const byId = new Map(topics.map((t) => [t.topic_id, t]))
  const nodes = new Set(topics.map((t) => t.topic_id))
  const { edges, broken } = acyclicEdges(input.edges, nodes)
  if (broken.length) notes.push(`${broken.length} ön koşul döngüsü kırıldı.`)

  const prereqsOf = new Map<string, string[]>()
  const dependentsOf = new Map<string, string[]>()
  for (const e of edges) {
    ;(prereqsOf.get(e.topic) ?? prereqsOf.set(e.topic, []).get(e.topic)!).push(e.prereq)
    ;(dependentsOf.get(e.prereq) ?? dependentsOf.set(e.prereq, []).get(e.prereq)!).push(e.topic)
  }

  const base = new Map<string, number>()
  for (const t of topics) base.set(t.topic_id, priorityScore({ weight: t.weight, effective: t.effective, netGap: t.netGap, hasConfidentGap: !!t.gapAtom }))

  // Ön koşul, bağlı konuların en yüksek puanını devralır (memo'lu DFS; graf döngüsüz).
  const effScore = new Map<string, number>()
  const resolve = (id: string): number => {
    const memo = effScore.get(id)
    if (memo !== undefined) return memo
    let s = base.get(id) ?? 0
    for (const d of dependentsOf.get(id) ?? []) s = Math.max(s, resolve(d))
    effScore.set(id, s)
    return s
  }
  for (const t of topics) resolve(t.topic_id)

  // Topolojik sıra: hazır olanlar (ön koşulu sıraya girmiş) arasından en yüksek puanlı.
  const placed = new Set<string>()
  const order: string[] = []
  // Mevcut hedefler önce (aktif; zaten çalışılıyor).
  const fixed = topics.filter((t) => existingByTopic.has(t.topic_id)).map((t) => t.topic_id)
  for (const id of fixed) {
    placed.add(id)
    order.push(id)
  }
  const pending = new Set(topics.map((t) => t.topic_id).filter((id) => !placed.has(id)))
  while (pending.size) {
    let best: string | null = null
    for (const id of pending) {
      if ((prereqsOf.get(id) ?? []).some((p) => !placed.has(p))) continue
      if (
        best === null ||
        effScore.get(id)! > effScore.get(best)! ||
        (effScore.get(id) === effScore.get(best) && base.get(id)! > base.get(best)!) ||
        (effScore.get(id) === effScore.get(best) && base.get(id) === base.get(best) && id < best)
      )
        best = id
    }
    if (best === null) best = Array.from(pending).sort()[0] // savunma: döngü kalmışsa
    pending.delete(best)
    placed.add(best)
    order.push(best)
  }

  const goal = (t: RoadmapTopicInput) => {
    const bt = blockTypeFor(t.effective)
    return { bt, q: GOAL_TEMPLATES[bt].questions, acc: GOAL_TEMPLATES[bt].accuracy }
  }

  const inExamPeriod = input.today >= examPeriodStart
  const queueIds = order.filter((id) => !existingByTopic.has(id))
  const startLoad = input.existing.reduce((sum, e) => sum + e.remainingMinutes, 0)

  // Dalga ataması: sırayla K'lık gruplar. Konu, ön koşulu aynı/sonraki dalgadaysa ya
  // da dalgada o dersten zaten MAX_ACTIVE_PER_SUBJECT konu varsa sonraki dalgaya kalır.
  const waveOf = new Map<string, number>()
  for (const id of fixed) waveOf.set(id, 1)
  const queueOrdered: string[] = []
  {
    let wave = 1
    let count = fixed.length
    let perSubject = new Map<string, number>()
    for (const id of fixed) {
      const sid = byId.get(id)!.subject_id
      perSubject.set(sid, (perSubject.get(sid) ?? 0) + 1)
    }
    const rest = [...queueIds]
    const nextWave = () => {
      wave += 1
      count = 0
      perSubject = new Map()
    }
    while (rest.length) {
      if (count >= slots) nextWave()
      const idx = rest.findIndex(
        (id) =>
          (perSubject.get(byId.get(id)!.subject_id) ?? 0) < MAX_ACTIVE_PER_SUBJECT &&
          (prereqsOf.get(id) ?? []).every((p) => (waveOf.get(p) ?? Infinity) < wave),
      )
      if (idx < 0) {
        nextWave()
        continue
      }
      const [id] = rest.splice(idx, 1)
      const sid = byId.get(id)!.subject_id
      perSubject.set(sid, (perSubject.get(sid) ?? 0) + 1)
      waveOf.set(id, wave)
      queueOrdered.push(id)
      count += 1
    }
  }

  const sched = scheduleWaves(
    queueOrdered.map((id) => {
      const g = goal(byId.get(id)!)
      return { id, needMinutes: needMinutes(g.bt, g.q, input.minutesPerQuestion), wave: waveOf.get(id)! }
    }),
    { weeklyMinutes: input.weeklyMinutes, start: input.today, planEnd: examPeriodStart, startLoadMinutes: startLoad },
  )

  // Açıklama şablonları.
  const topExamWrongBySubject = new Map<string, string>()
  for (const t of topics) {
    if (t.examWrongs <= 0) continue
    const cur = topExamWrongBySubject.get(t.subject_id)
    if (!cur || byId.get(cur)!.examWrongs < t.examWrongs) topExamWrongBySubject.set(t.subject_id, t.topic_id)
  }
  // Aynı adlı konularda (TYT/AYT Olasılık) ders adıyla ayırt et.
  const nameOf = (id: string, from?: RoadmapTopicInput) => {
    const t = byId.get(id)
    if (!t) return ""
    return from && t.topic_name === from.topic_name ? `${t.subject_name} ${t.topic_name}` : t.topic_name
  }

  const items: RoadmapItem[] = []
  let overflowCount = 0
  const finalOrder = [...fixed, ...queueOrdered]
  finalOrder.forEach((id, i) => {
    const t = byId.get(id)!
    const g = goal(t)
    const ex = existingByTopic.get(id) ?? null
    const s = sched.get(id)
    const reasons: string[] = []
    if (ex) reasons.push(ex.source === "coach" ? "Koçundan devralınan hedef" : "Kendi eklediğin hedef")
    const deps = (dependentsOf.get(id) ?? []).filter((d) => nodes.has(d))
    if (deps.length) reasons.push(`${t.topic_name} önce, çünkü ${joinNames(deps.slice(0, 3).map((d) => nameOf(d, t)))} konusunun ön koşulu`)
    if (topExamWrongBySubject.get(t.subject_id) === id) {
      reasons.push(`Denemende ${t.subject_name} dersinde en çok net ${t.topic_name} konusunda gitti`)
    }
    if (t.assessment === "biliyorum" && t.examWrongs > 0) {
      reasons.push(`Biliyorum demiştin ama denemede ${t.examWrongs} yanlış çıktı`)
    }
    if (t.gapAtom) reasons.push(`Açık haritasında "${t.gapAtom}" öne çıkıyor`)
    if (g.bt === "konu_calisma") reasons.push(`Ustalığın ${Math.round(t.effective)}: önce konu çalışması`)
    reasons.push(`Sınavda ortalama ${round1(t.weight)} soru${t.weightEstimated ? " (tahmini)" : ""}`)

    let status: RoadmapItemStatus
    if (ex) status = "aktif"
    else if (inExamPeriod || !s?.fits) status = "zaman_kalirsa"
    else status = (s?.wave ?? 1) === 1 ? "aktif" : "sirada"
    if (status === "zaman_kalirsa") overflowCount += 1

    items.push({
      topic_id: id,
      topic_name: t.topic_name,
      subject_id: t.subject_id,
      subject_name: t.subject_name,
      score: round1(base.get(id) ?? 0),
      block_type: g.bt,
      target_questions: g.q,
      target_accuracy: g.acc,
      need_minutes: needMinutes(g.bt, g.q, input.minutesPerQuestion),
      wave: ex ? 1 : (s?.wave ?? 1),
      plan_order: i + 1,
      start: ex ? input.today : (s?.start ?? input.today),
      end: ex ? ex.son_tarih : (s?.end ?? examPeriodStart),
      status,
      reasons,
      prereqs: prereqsOf.get(id) ?? [],
      existing: ex ? { assignment_id: ex.assignment_id, source: ex.source } : null,
    })
  })

  if (inExamPeriod) notes.push("Deneme dönemindesin: yeni konu açılmıyor; deneme, tekrar ve açık kapatma öncelikli.")

  return {
    today: input.today,
    examDate: input.examDate,
    examPeriodStart,
    weeklyMinutes: input.weeklyMinutes,
    activeSlots: slots,
    minutesPerQuestion: input.minutesPerQuestion,
    items,
    overflow: overflowCount > 0 && !inExamPeriod ? { count: overflowCount, message: overflowMessage(overflowCount) } : null,
    brokenCycles: broken,
    notes,
  }
}

/** Zamanında mı? Geçen süre oranı ile ilerleme oranı karşılaştırması. */
export function paceStatus(opts: { start: string; end: string; today: string; solved: number; target: number | null }): "zamaninda" | "geride" {
  if (!opts.target) return "zamaninda"
  const total = Math.max(daysBetweenIso(opts.start, opts.end), 1)
  const elapsed = clamp(daysBetweenIso(opts.start, opts.today), 0, total)
  return opts.solved / opts.target >= elapsed / total - PACE_TOLERANCE ? "zamaninda" : "geride"
}
