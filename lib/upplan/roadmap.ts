import {
  ACTIVE_TOPICS_RANGE,
  AYT_FORCE_START_WEEKS,
  AYT_PREREQ_SUBJECTS,
  CAPACITY_UTILIZATION,
  COMPLETION_MASTERY,
  DEFAULT_MINUTES_PER_QUESTION,
  EXAM_PERIOD_WEEKS,
  GAP_MULTIPLIER,
  GATE_MASTERY,
  DERS_TABAN_ORANI,
  SIFIR_AGIRLIK_TABANI,
  GOAL_TEMPLATES,
  HOURS_BY_STATE,
  PRACTICE_GROUPS,
  SCORE_COEFFICIENTS,
  SUBJECT_TESTS,
  TARGET_MASTERY,
  type PuanTuru,
  LECTURE_MINUTES,
  MAX_ACTIVE_PER_SUBJECT,
  MAX_LEARNING_ACTIVE,
  MINUTES_PER_QUESTION_RANGE,
  MIN_TIMED_QUESTIONS,
  MIN_WEEKLY_MINUTES_PER_ACTIVE,
  NET_GAP_STRENGTH,
  PACE_TOLERANCE,
  PRACTICE_EXAMS_PER_WEEK,
  PRACTICE_EXAM_MINUTES,
  SHORT_REVIEW_MINUTES,
  DEFAULT_TOPIC_SIZE,
  SUBJECT_TOPIC_SIZE,
  TOPIC_SIZE_RANGE,
  UPPLAN_SQL_CONFIG,
  type BlockType,
} from "@/lib/upplan/config"

// UpPlan yol haritası — saf fonksiyonlar (LLM yok, test edilir).
//
// VERİMLİLİK (saat başına puan) =
//          ortalama soru × testin net başına puan katsayısı (puan türüne göre)
//          × kazanılabilir pay ((90 − etkili)/100) × ders net açığı × açık çarpanı
//          / gereken saat (hiç görmedim 5, eksik 3, biliyorum 1; soru hızıyla ölçekli)
//          Ders önceliği elle verilmez: farkı katsayılar ve soru sayıları yaratır.
// SIRA   = ön koşul grafı (topolojik) + puan; ön koşul, kendisine bağlı konuların
//          en yüksek puanını devralır (önce açılsın diye)
// KAPI   = AYT dersi, ilgili TYT dersinin temel konuları bitmeden açılmaz; sınava
//          AYT_FORCE_START_WEEKS kala kapı kapalı olsa da TYT ile paralel başlar
// TAKVİM = gün gün simülasyon (simulatePlan): aynı anda K aktif konu (4-6), en çok
//          4'ü öğrenme aşamasında, dersten en çok 2; günlük kapasite aktif konulara
//          eşit bölünür, biten konunun yerine sıradaki (ön koşulu/kapısı açık) girer
//          → her hedefin kendi gerçekçi bitiş tarihi olur
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

/**
 * Öğrenme aşaması: "hiç görmedim" ya da etkili < 40 → konu anlatımı zorunlu;
 * "eksik" → opsiyonel kısa tekrar; "biliyorum"/iyi → yok.
 */
export type LearningPhase = "gerekli" | "opsiyonel" | "yok"
export const LEARNING_PHASES: readonly LearningPhase[] = ["gerekli", "opsiyonel", "yok"]

export function learningPhaseFor(assessment: RoadmapTopicInput["assessment"], effective: number): LearningPhase {
  if (assessment === "hic_gormedim" || effective < UPPLAN_SQL_CONFIG.label_gelisiyor) return "gerekli"
  if (assessment === "eksik") return "opsiyonel"
  return "yok"
}

/** Dersin net başına puan katsayısı (puan türüne göre; ders iki teste bölünüyorsa soru ağırlıklı ortalama). 0 = puana girmiyor. */
export function subjectCoefficient(puan: PuanTuru | null, subjectName: string): number {
  if (!puan) return 1
  const parts = SUBJECT_TESTS[subjectName]
  if (!parts?.length) return 0
  const table = SCORE_COEFFICIENTS[puan]
  const q = parts.reduce((n, p) => n + p.questions, 0)
  return Math.round((parts.reduce((n, p) => n + p.questions * (table[p.test] ?? 0), 0) / q) * 1000) / 1000
}

/** Konuyu hedefe getirmek için gereken saat: duruma göre config, soru hızıyla ölçekli. */
export function hoursNeeded(assessment: RoadmapTopicInput["assessment"], effective: number, mpq = DEFAULT_MINUTES_PER_QUESTION): number {
  const state =
    assessment ?? (effective < UPPLAN_SQL_CONFIG.label_gelisiyor ? "hic_gormedim" : effective < UPPLAN_SQL_CONFIG.label_iyi ? "eksik" : "biliyorum")
  return Math.round(HOURS_BY_STATE[state] * (mpq / DEFAULT_MINUTES_PER_QUESTION) * 100) / 100
}

/**
 * Saat başına puan: ortalama soru × katsayı × kazanılabilir pay × net açığı ×
 * açık çarpanı / gereken saat. Kazanılabilir pay = (TARGET_MASTERY − etkili)/100, alt sınır 0.
 */
export function efficiencyScore(t: {
  weight: number
  coefficient: number
  effective: number
  netGap: number
  hasConfidentGap: boolean
  hours: number
  /** Çapraz kayıt: konunun öbür sınavdaki (TYT konusunun AYT'deki) soru × o sınavın katsayısı. */
  crossValue?: number
}): number {
  const gain = Math.max(TARGET_MASTERY - clamp(t.effective, 0, 100), 0) / 100
  const value = t.weight * t.coefficient + (t.crossValue ?? 0)
  const raw = (value * gain * t.netGap * (t.hasConfidentGap ? GAP_MULTIPLIER : 1)) / Math.max(t.hours, 0.25)
  return Math.round(raw * 1000) / 1000
}

/**
 * topic_exam_weights satırından konu soru sayısı: satır yoksa undefined (yedek
 * hesap kullanılır); avg = 0 ve "sorulmadi" → dersin konu başı ortalamasının
 * SIFIR_AGIRLIK_TABANI kadarı (tamamen dışarı atılmaz); diğer sıfırlar 0.
 */
export function topicWeightFromRow(
  row: { avg: number; sifirNedeni: string | null } | undefined,
  subjectAvgPerTopic: number,
): number | undefined {
  if (!row) return undefined
  if (row.avg > 0) return row.avg
  return row.sifirNedeni === "sorulmadi" ? Math.round(SIFIR_AGIRLIK_TABANI * subjectAvgPerTopic * 1000) / 1000 : 0
}

/** Dersin puan ağırlığı = sınavdaki soru sayısı × puan katsayısı (puan türü dışı → 0). */
export function subjectScoreWeight(puan: PuanTuru | null, subjectName: string): number {
  const q = (SUBJECT_TESTS[subjectName] ?? []).reduce((n, p) => n + p.questions, 0)
  return Math.round(q * subjectCoefficient(puan, subjectName) * 1000) / 1000
}

/**
 * Ders taban payları (dk): kapasite × oran × ders ağırlığı / toplam ağırlık.
 * Ağırlığı 0 olan ders taban almaz; toplam kapasiteyi aşarsa orantılı küçülür.
 */
export function subjectFloors(capacityMinutes: number, weights: Map<string, number>, ratio = DERS_TABAN_ORANI): Map<string, number> {
  const out = new Map<string, number>()
  const total = Array.from(weights.values()).reduce((n, w) => n + Math.max(w, 0), 0)
  if (total <= 0 || capacityMinutes <= 0) return out
  const pool = Math.min(capacityMinutes * ratio, capacityMinutes)
  for (const [k, w] of weights) if (w > 0) out.set(k, (pool * w) / total)
  return out
}

/**
 * Konu büyüklük çarpanı: dersin tipik konu büyüklüğü × konunun ders içindeki
 * göreli büyüklüğü (atom sayısı, yoksa gerçek soru sayısı, yoksa 1); aralıkta sınırlı.
 */
export function topicSizeFactor(t: {
  subjectName: string
  atomCount?: number
  subjectAvgAtoms?: number
  avgQuestions?: number | null
  subjectAvgQuestions?: number
}): number {
  const typical = SUBJECT_TOPIC_SIZE[t.subjectName] ?? DEFAULT_TOPIC_SIZE
  let rel = 1
  if (t.atomCount && t.subjectAvgAtoms) rel = t.atomCount / t.subjectAvgAtoms
  else if (t.avgQuestions && t.subjectAvgQuestions) rel = t.avgQuestions / t.subjectAvgQuestions
  return Math.round(clamp(typical * rel, TOPIC_SIZE_RANGE.min, TOPIC_SIZE_RANGE.max) * 100) / 100
}

/** Konu hangi sürekli pratik grubunda (yoksa null). */
export function practiceGroupOf(subjectName: string, topicName: string): (typeof PRACTICE_GROUPS)[number] | null {
  return PRACTICE_GROUPS.find((g) => g.subject === subjectName && g.topics.includes(topicName)) ?? null
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

/**
 * Bir konu hedefinin toplam süre ihtiyacı (dk): soru süresi + öğrenme aşaması
 * (gerekli → konu anlatımı, opsiyonel → kısa tekrar). Aşama verilmezse eski
 * kural: konu_calisma şablonu konu anlatımı içerir.
 */
export function needMinutes(blockType: BlockType, questions: number, mpq: number, phase?: LearningPhase): number {
  const learn =
    phase === undefined
      ? blockType === "konu_calisma"
        ? LECTURE_MINUTES
        : 0
      : phase === "gerekli"
        ? LECTURE_MINUTES
        : phase === "opsiyonel"
          ? SHORT_REVIEW_MINUTES
          : 0
  return Math.round(questions * mpq + learn)
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
  /** Sınavdaki ortalama soru (topic_exam_weights; yoksa ders soru sayısı / konu sayısı). */
  weight: number
  weightEstimated: boolean
  /** Testin net başına puan katsayısı (puan türüne göre; verilmezse 1). */
  coefficient?: number
  /** Gereken saat (verilmezse hoursNeeded × sizeFactor). */
  hours?: number
  /** Konu büyüklük çarpanı (topicSizeFactor; verilmezse 1): saat ve hedef soru ölçeği. */
  sizeFactor?: number
  /** Konunun bilgi atomu sayısı (kapı zinciri güvenilirliği ve büyüklük). */
  atomCount?: number
  /** Çapraz kayıt katkısı (öbür sınavdaki soru × o sınavın katsayısı); verimliliğe eklenir. */
  crossValue?: number
  /** topic_exam_weights: son yıllarda sorulmadı (avg 0, sifir_nedeni "sorulmadi"); taban ağırlık verildi. */
  notAsked?: boolean
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
  learning_phase?: LearningPhase
  /** AYT kapısı: bitmesi beklenen TYT temel konuları (kapı açıksa boş). */
  gate?: string[]
  /** Saat başına yaklaşık puan. */
  efficiency?: number
  /** Sıralamada kullanılan verimlilik (ön koşul/kapı devralmalı). */
  priority?: number
  /** Bu TYT konusu kapısı kapalı bir AYT dersinin kapısıysa o dersin adı (planda kalır). */
  gate_for?: string
  /** Sürekli pratik konusu (tamamlanmaz, aktif sınırına sayılmaz, her hafta pratik bloğu). */
  practice?: boolean
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
  /** Bu tarihten itibaren AYT konuları kapı kapalı olsa da başlar. */
  aytForceStart?: string
  /** Ders bazlı ayrılan saat (plana giren konular + sürekli pratik), çoktan aza. */
  subjectHours?: { subject_id: string; subject_name: string; hours: number }[]
  /**
   * Haftalık saat göstergesi (müsaitlik saati cinsinden): şu an, bütün konuları
   * bitirmek için gereken, ve hangi saatte hangi derslerin tamamen plana gireceği.
   */
  weeklyHours?: { current: number; required: number; steps: { hours: number; subjects: string[] }[] }
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
  /** Öğrencinin puan türü (ders taban payı ağırlıkları); yoksa taban payı yok. */
  puanTuru?: PuanTuru | null
  /** Müsaitlik ızgarasındaki haftalık süre (dk) — "haftada X saat" göstergesi için. */
  availableWeeklyMinutes?: number
}

export function overflowMessage(n: number): string {
  return `Bu tempoyla ${n} konuya yetişemiyorsun; haftalık saatini artır ya da bunları sona bırak.`
}

/** "Saat başına yaklaşık X puan: sınavda ortalama N soru çıkıyor ve henüz bilmiyorsun." */
export function efficiencyReason(t: RoadmapTopicInput, efficiency: number): string {
  const state =
    t.assessment === "hic_gormedim" || t.effective < UPPLAN_SQL_CONFIG.label_gelisiyor
      ? "henüz bilmiyorsun"
      : t.effective < UPPLAN_SQL_CONFIG.label_iyi
        ? "eksiklerin var"
        : "pekiştirmen yeterli"
  const x = (efficiency >= 10 ? String(Math.round(efficiency)) : efficiency.toFixed(efficiency < 0.1 ? 2 : 1)).replace(".", ",")
  // "Sorulmadı" kaydı: soru sayısı yerine durum; küçük taban pay verildiği söylenir.
  if (t.notAsked) return `Saat başına yaklaşık ${x} puan: son yıllarda sorulmadı (küçük bir pay ayrıldı) ve ${state}`
  const n = String(Math.round(t.weight * 100) / 100).replace(".", ",")
  // Tahmini ağırlık "yaklaşık" diye geçer (yedek hesap ya da tahmini=true kayıt).
  return `Saat başına yaklaşık ${x} puan: sınavda ${t.weightEstimated ? "yaklaşık" : "ortalama"} ${n} soru çıkıyor ve ${state}`
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

// ── AYT kapısı ──────────────────────────────────────────────────────────
/**
 * Ders bazlı kapı konuları: AYT dersinin konularının ön koşul zincirindeki,
 * eşlenen TYT derslerine ait konular; zincirde yoksa config'teki temel konular.
 * Dönüş: AYT subject_id → henüz geçilmemiş (tamamlanmamış, etkili < 75) kapı konuları.
 */
export function computeGates(
  topics: Pick<RoadmapTopicInput, "topic_id" | "topic_name" | "subject_id" | "subject_name" | "effective" | "atomCount">[],
  edges: Edge[],
  completed: Set<string>,
): Map<string, string[]> {
  const byId = new Map(topics.map((t) => [t.topic_id, t]))
  const prereqsOf = new Map<string, string[]>()
  for (const e of edges) (prereqsOf.get(e.topic) ?? prereqsOf.set(e.topic, []).get(e.topic)!).push(e.prereq)
  const out = new Map<string, string[]>()
  const subjects = new Map<string, string>()
  for (const t of topics) subjects.set(t.subject_id, t.subject_name)
  for (const [sid, sname] of subjects) {
    const tytNames = AYT_PREREQ_SUBJECTS[sname]
    if (!tytNames) continue
    // Ön koşul zinciri (geriye doğru; ziyaret kümesi döngüye karşı).
    const seen = new Set<string>()
    const stack = topics.filter((t) => t.subject_id === sid).map((t) => t.topic_id)
    while (stack.length) {
      const id = stack.pop()!
      for (const p of prereqsOf.get(id) ?? []) {
        if (seen.has(p)) continue
        seen.add(p)
        stack.push(p)
      }
    }
    // Zincir ancak AYT dersinin tüm konularında atom (ön koşul) verisi varsa
    // güvenilir; yoksa ya da eksikse kapı = ilgili TYT dersinin TÜM konuları.
    const chainComplete = topics.filter((t) => t.subject_id === sid).every((t) => (t.atomCount ?? 0) > 0)
    let gate = chainComplete ? Array.from(seen).filter((id) => tytNames.includes(byId.get(id)?.subject_name ?? "")) : []
    if (gate.length === 0) gate = topics.filter((t) => tytNames.includes(t.subject_name)).map((t) => t.topic_id)
    out.set(
      sid,
      gate.filter((id) => !completed.has(id) && (byId.get(id)?.effective ?? 0) < GATE_MASTERY),
    )
  }
  return out
}

// ── Takvim simülasyonu ──────────────────────────────────────────────────
export type SimEntry = {
  id: string
  /** Toplam süre ihtiyacı (dk). */
  need: number
  subject: string
  /** Öğrenme aşamasının süresi (dk; 0 = yok). Bu kadar ilerleyene dek "öğrenmede" sayılır. */
  learnMinutes: number
  /** Planda olan ön koşullar: bitmeden başlamaz. */
  prereqs: string[]
  /** Kapı konuları: hepsi bitmeden (ya da forceStart gelmeden) başlamaz. */
  gate: string[]
}

export type SimResult = { start: string | null; end: string | null; forced: boolean }

/**
 * Gün gün simülasyon. Her gün: boş yer varsa sıradaki uygun konular başlar
 * (ön koşulu bitti, kapısı açık ya da forceStart geldi, ders ve öğrenme
 * sınırı), günlük kapasite aktif konulara eşit bölünür; ihtiyacı dolan konu o
 * gün biter. preActive: zaten çalışılan hedefler (yer kaplar, sonuçta yer alır).
 */
export function simulatePlan(
  entries: SimEntry[],
  opts: {
    start: string
    weeklyMinutes: number
    slots: number
    horizon: string
    forceStart: string
    maxPerSubject?: number
    maxLearning?: number
    preActive?: SimEntry[]
  },
): Map<string, SimResult> {
  const perDay = Math.max(opts.weeklyMinutes, 1) / 7
  const maxPerSubject = opts.maxPerSubject ?? MAX_ACTIVE_PER_SUBJECT
  const maxLearning = opts.maxLearning ?? MAX_LEARNING_ACTIVE
  const res = new Map<string, SimResult>()
  const finished = new Set<string>()
  type Run = { e: SimEntry; done: number }
  const active: Run[] = (opts.preActive ?? []).map((e) => {
    res.set(e.id, { start: opts.start, end: null, forced: false })
    return { e, done: 0 }
  })
  const inPlan = new Set([...entries, ...(opts.preActive ?? [])].map((e) => e.id))
  const pending = [...entries]
  const horizonDays = Math.max(daysBetweenIso(opts.start, opts.horizon), 0)

  for (let d = 0; d <= horizonDays && (pending.length || active.length); d++) {
    const date = addDaysIso(opts.start, d)
    for (let i = 0; i < pending.length && active.length < opts.slots; i++) {
      const e = pending[i]
      if (e.prereqs.some((p) => inPlan.has(p) && !finished.has(p))) continue
      const gateOpen = e.gate.every((g) => !inPlan.has(g) || finished.has(g))
      const forced = !gateOpen && date >= opts.forceStart
      if (!gateOpen && !forced) continue
      if (active.filter((r) => r.e.subject === e.subject).length >= maxPerSubject) continue
      if (e.learnMinutes > 0 && active.filter((r) => r.done < r.e.learnMinutes).length >= maxLearning) continue
      active.push({ e, done: 0 })
      res.set(e.id, { start: date, end: null, forced })
      pending.splice(i, 1)
      i -= 1
    }
    if (!active.length) continue
    const share = perDay / active.length
    for (let i = active.length - 1; i >= 0; i--) {
      const r = active[i]
      r.done += share
      if (r.done >= r.e.need) {
        res.get(r.e.id)!.end = date
        finished.add(r.e.id)
        active.splice(i, 1)
      }
    }
  }
  for (const e of pending) res.set(e.id, { start: null, end: null, forced: false })
  return res
}

// ── Ana fonksiyon ───────────────────────────────────────────────────────
export function buildRoadmap(input: RoadmapInput): Roadmap {
  const examPeriodStart = addDaysIso(input.examDate, -EXAM_PERIOD_WEEKS * 7)
  const aytForceStart = addDaysIso(input.examDate, -AYT_FORCE_START_WEEKS * 7)
  const slots = activeSlotsFor(input.weeklyMinutes)
  const completed = new Set(input.completedTopicIds)
  const existingByTopic = new Map(input.existing.map((e) => [e.topic_id, e]))
  const notes: string[] = []

  // Sürekli pratik konuları takvime (aktif sınırı, simülasyon) girmez; ayrı listelenir.
  const practiceTopics = input.topics.filter((t) => practiceGroupOf(t.subject_name, t.topic_name))
  const practiceIds = new Set(practiceTopics.map((t) => t.topic_id))
  const topics = input.topics.filter((t) => !completed.has(t.topic_id) && !practiceIds.has(t.topic_id))
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

  const gates = computeGates(input.topics, input.edges, completed)

  const hoursOf = (t: RoadmapTopicInput) =>
    t.hours ?? Math.round(hoursNeeded(t.assessment, t.effective, input.minutesPerQuestion) * (t.sizeFactor ?? 1) * 100) / 100
  const effOf = (t: RoadmapTopicInput) =>
    efficiencyScore({
      weight: t.weight,
      coefficient: t.coefficient ?? 1,
      effective: t.effective,
      netGap: t.netGap,
      hasConfidentGap: !!t.gapAtom,
      hours: hoursOf(t),
      crossValue: t.crossValue,
    })
  const base = new Map<string, number>()
  for (const t of topics) base.set(t.topic_id, effOf(t))

  // Kapı konusu (TYT), kapısını beklediği AYT dersinin konularını "bağlı" sayar.
  const gateDependents = new Map<string, string[]>()
  for (const [sid, gate] of gates) {
    const ayt = topics.filter((t) => t.subject_id === sid).map((t) => t.topic_id)
    for (const g of gate) gateDependents.set(g, [...(gateDependents.get(g) ?? []), ...ayt])
  }
  // Mevcut hedefler önce (aktif; zaten çalışılıyor).
  const fixed = topics.filter((t) => existingByTopic.has(t.topic_id)).map((t) => t.topic_id)

  // Sıralama (dışarıda sayılan AYT dersleri hariç tutularak):
  // ön koşul ve kapı konusu, bağlı konuların en yüksek verimliliğini devralır
  // (memo'lu DFS); topolojik sıra = hazır olanlar arasından en yüksek öncelikli.
  const rankTopics = (outAyt: Set<string>) => {
    const effScore = new Map<string, number>()
    const resolve = (id: string): number => {
      const memo = effScore.get(id)
      if (memo !== undefined) return memo
      effScore.set(id, base.get(id) ?? 0) // döngü savunması
      let s = base.get(id) ?? 0
      for (const d of dependentsOf.get(id) ?? []) s = Math.max(s, resolve(d))
      for (const d of gateDependents.get(id) ?? []) if (!outAyt.has(byId.get(d)?.subject_id ?? "")) s = Math.max(s, resolve(d))
      effScore.set(id, s)
      return s
    }
    for (const t of topics) resolve(t.topic_id)
    const placed = new Set<string>(fixed)
    const order: string[] = [...fixed]
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
    return { effScore, order }
  }

  const goal = (t: RoadmapTopicInput) => {
    const bt = blockTypeFor(t.effective)
    const phase = learningPhaseFor(t.assessment, t.effective)
    // Hedef soru konu büyüklüğüyle ölçeklenir (10'a yuvarlı, en az 20).
    const q = Math.max(20, Math.round((GOAL_TEMPLATES[bt].questions * (t.sizeFactor ?? 1)) / 10) * 10)
    return { bt, phase, q, acc: GOAL_TEMPLATES[bt].accuracy, need: needMinutes(bt, q, input.minutesPerQuestion, phase) }
  }
  const gateOf = (id: string) => gates.get(byId.get(id)!.subject_id) ?? []
  // Takvimde ön koşul, yalnız henüz bilinmiyorsa (etkili < 75) bekletir; zaten
  // iyi bilinen ön koşul sıralamada önde kalır ama başlamayı geciktirmez.
  const simEntry = (id: string, need: number): SimEntry => ({
    id,
    need,
    subject: byId.get(id)!.subject_id,
    learnMinutes: goal(byId.get(id)!).phase === "gerekli" ? LECTURE_MINUTES : 0,
    // Kapı konusu olan ön koşulu kapı yönetir (son tarihte zorla açılabilsin).
    prereqs: (prereqsOf.get(id) ?? []).filter((p) => (byId.get(p)?.effective ?? 0) < GATE_MASTERY && !gateOf(id).includes(p)),
    gate: gateOf(id),
  })

  const inExamPeriod = input.today >= examPeriodStart
  const outAyt = new Set<string>()
  let { effScore, order } = rankTopics(outAyt)
  let queueIds = order.filter((id) => !existingByTopic.has(id))
  // Sürekli pratik haftalık süresi takvim kapasitesinden düşülür.
  const practiceGroups = PRACTICE_GROUPS.filter((g) => practiceTopics.some((t) => t.subject_name === g.subject && g.topics.includes(t.topic_name)))
  const practiceWeekly = Math.round(practiceGroups.reduce((n, g) => n + g.blocksPerWeek * g.questionsPerBlock * input.minutesPerQuestion, 0))
  const studyWeekly = Math.max(input.weeklyMinutes - practiceWeekly, 60)

  // Kapasite seçimi: verimlilik sırasıyla (ön koşul/kapı devralmalı sıra) deneme
  // dönemine kadarki kapasite dolana dek konu alınır; kalanlar (en düşük
  // verimliler) "zaman kalırsa". Kapısı kapalı AYT dersinin TYT konusu her zaman
  // alınır. Takvim (tarihler) yalnız seçilenlerle kurulur.
  const startLoad = input.existing.reduce((n, e) => n + e.remainingMinutes, 0)
  const capacityMinutes = Math.max(daysBetweenIso(input.today, examPeriodStart), 0) * (studyWeekly / 7) - startLoad
  // Ders taban payları: puan türüne giren her ders, kapasitenin DERS_TABAN_ORANI
  // kadarından puan ağırlığı (soru × katsayı) oranında pay alır.
  const subjectNameOf = new Map(topics.map((t) => [t.subject_id, t.subject_name]))
  const floors = input.puanTuru
    ? subjectFloors(
        capacityMinutes,
        new Map(Array.from(subjectNameOf).map(([sid, name]) => [sid, subjectScoreWeight(input.puanTuru ?? null, name)])),
      )
    : new Map<string, number>()
  const needOf = (id: string) => goal(byId.get(id)!).need

  // Seçim:
  //  A) Taban: dersler ağırlık sırasıyla; ders kendi konularında verimlilik
  //     sırasıyla tabanına kadar alır (ilk konusu her zaman → hiçbir ders sıfır kalmaz).
  //  B) Kalan kapasite: bütün konular verimlilik sırasıyla, ilk sığmayan konuda kesilir
  //     (küçük konu, daha verimli büyük konunun yerine geçmesin).
  //  Kapı: bir AYT konusu alındığında o dersin TYT kapı konuları da AYNI ANDA alınır
  //  (maliyeti de); kapı yüzünden sığmayan AYT konusu alınmaz. Böylece plana giren
  //  her AYT dersinin TYT dersi planda ve korunur; tutarsızlık oluşmaz.
  const select = (skip: (id: string) => boolean) => {
    const out = new Set<string>()
    const inQueue = new Set(queueIds)
    let used = 0
    const take = (id: string) => {
      const extra = (gates.get(byId.get(id)!.subject_id) ?? []).filter((g) => inQueue.has(g) && !out.has(g))
      const cost = needOf(id) + extra.reduce((n, g) => n + needOf(g), 0)
      if (used + cost > capacityMinutes) return false
      out.add(id)
      for (const g of extra) out.add(g)
      used += cost
      return true
    }
    for (const [sid, floor] of Array.from(floors).sort((x, y) => y[1] - x[1])) {
      let sUsed = 0
      for (const id of queueIds) {
        if (byId.get(id)!.subject_id !== sid || out.has(id) || skip(id)) continue
        const n = needOf(id)
        if (sUsed > 0 && sUsed + n > floor) break
        if (!take(id)) break
        sUsed += n
      }
    }
    for (const id of queueIds) {
      if (out.has(id) || skip(id)) continue
      if (!take(id)) break
    }
    return out
  }
  // Plana hiç giremeyen AYT dersi "dışarıda": konuları planlanmaz, TYT konuları
  // kapı devralması olmadan kendi verimliliğiyle sıralanır (yalnız artar → biter).
  const isOutAyt = (id: string) => outAyt.has(byId.get(id)!.subject_id)
  let kept = select(isOutAyt)
  for (let guard = 0; guard < gates.size + 1; guard++) {
    const newlyOut = Array.from(gates.keys()).filter(
      (sid) => !outAyt.has(sid) && topics.some((t) => t.subject_id === sid) && !topics.some((t) => t.subject_id === sid && kept.has(t.topic_id)),
    )
    if (!newlyOut.length) break
    for (const sid of newlyOut) outAyt.add(sid)
    ;({ effScore, order } = rankTopics(outAyt))
    queueIds = order.filter((id) => !existingByTopic.has(id))
    kept = select(isOutAyt)
  }
  const keptSubjects = new Set(Array.from(kept).map((id) => byId.get(id)!.subject_id))
  const protectsPlanned = (id: string) => (gateDependents.get(id) ?? []).some((a) => keptSubjects.has(byId.get(a)?.subject_id ?? ""))

  // Haftalık saat göstergesi (müsaitlik saati): bütün konular için gereken ve
  // ek saatle tamamen plana girecek dersler (en ucuzdan pahalıya, kümülatif).
  const planWeeks = Math.max(daysBetweenIso(input.today, examPeriodStart), 7) / 7
  const availPerCapacity = (input.availableWeeklyMinutes ?? input.weeklyMinutes) / Math.max(input.weeklyMinutes, 1)
  const toAvailHours = (studyMinutesPerWeek: number) => Math.ceil(((studyMinutesPerWeek + practiceWeekly) * availPerCapacity) / 60)
  const extraBySubject = new Map<string, number>()
  for (const id of queueIds) {
    if (kept.has(id)) continue
    const sid = byId.get(id)!.subject_id
    extraBySubject.set(sid, (extraBySubject.get(sid) ?? 0) + needOf(id))
  }
  const steps: { hours: number; subjects: string[] }[] = []
  let cum = 0
  for (const [sid, extra] of Array.from(extraBySubject).sort((x, y) => x[1] - y[1])) {
    cum += extra
    const hours = toAvailHours((capacityMinutes + startLoad + cum) / planWeeks)
    const last = steps[steps.length - 1]
    if (last && last.hours === hours) last.subjects.push(subjectNameOf.get(sid) ?? "")
    else steps.push({ hours, subjects: [subjectNameOf.get(sid) ?? ""] })
  }
  const totalNeed = queueIds.reduce((n, id) => n + needOf(id), 0) + startLoad
  const weeklyHours = {
    current: Math.round((input.availableWeeklyMinutes ?? input.weeklyMinutes) / 60),
    required: toAvailHours(totalNeed / planWeeks),
    steps,
  }
  const sim = simulatePlan(
    queueIds.filter((id) => kept.has(id)).map((id) => simEntry(id, goal(byId.get(id)!).need)),
    {
      start: input.today,
      weeklyMinutes: studyWeekly,
      slots,
      horizon: input.examDate,
      forceStart: aytForceStart,
      preActive: fixed.map((id) => ({ ...simEntry(id, existingByTopic.get(id)!.remainingMinutes), prereqs: [], gate: [] })),
    },
  )

  // Plan sırası = başlama tarihi (eşitlikte öncelik sırası); başlayamayanlar sonda.
  const rank = new Map(order.map((id, i) => [id, i]))
  const queueOrdered = [...queueIds].sort((a, b) => {
    const sa = sim.get(a)?.start ?? "9999"
    const sb = sim.get(b)?.start ?? "9999"
    return sa.localeCompare(sb) || rank.get(a)! - rank.get(b)!
  })

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
  const tytOf = (subjectName: string) => joinNames([...(AYT_PREREQ_SUBJECTS[subjectName] ?? [])])

  const items: RoadmapItem[] = []
  let overflowCount = 0
  const finalOrder = [...fixed, ...queueOrdered]
  finalOrder.forEach((id, i) => {
    const t = byId.get(id)!
    const g = goal(t)
    const ex = existingByTopic.get(id) ?? null
    const s = sim.get(id)
    const reasons: string[] = [efficiencyReason(t, base.get(id) ?? 0)]
    if (ex) reasons.push(ex.source === "coach" ? "Koçundan devralınan hedef" : "Kendi eklediğin hedef")
    const deps = (dependentsOf.get(id) ?? []).filter((d) => nodes.has(d))
    if (deps.length) {
      const shown = deps.slice(0, 3).map((d) => nameOf(d, t))
      reasons.push(`${t.topic_name} önce, çünkü ${joinNames(shown)} ${shown.length > 1 ? "konularının" : "konusunun"} ön koşulu`)
    }
    const gate = ex ? [] : gateOf(id)
    if (gate.length && s?.forced) {
      reasons.push(`Sınava ${AYT_FORCE_START_WEEKS} hafta kaldığı için ${tytOf(t.subject_name)} ile paralel başlıyor`)
    } else if (gate.length) {
      reasons.push(`${tytOf(t.subject_name)} temel konuları bitince açılır`)
    }
    if (topExamWrongBySubject.get(t.subject_id) === id) {
      reasons.push(`Denemende ${t.subject_name} dersinde en çok net ${t.topic_name} konusunda gitti`)
    }
    if (t.assessment === "biliyorum" && t.examWrongs > 0) {
      reasons.push(`Biliyorum demiştin ama denemede ${t.examWrongs} yanlış çıktı`)
    }
    if (t.gapAtom) reasons.push(`Açık haritasında "${t.gapAtom}" öne çıkıyor`)
    if (g.phase === "gerekli") reasons.push(`Ustalığın ${Math.round(t.effective)}: önce konuyu öğren, sonra soru çöz`)

    // Kapasiteye seçilen konu plandadır; takvimde deneme dönemine taşarsa bitişi o güne çekilir.
    let status: RoadmapItemStatus
    if (ex) status = "aktif"
    else if (inExamPeriod || !kept.has(id) || !s?.start) status = "zaman_kalirsa"
    else status = s.start === input.today ? "aktif" : "sirada"
    const gatedAyt = protectsPlanned(id) ? gateDependents.get(id) : undefined
    if (gatedAyt?.length && !ex) {
      const aytName = byId.get(gatedAyt[0])?.subject_name
      if (aytName) reasons.splice(1, 0, `${aytName} bu konuyu bekliyor: ${t.subject_name} bitmeden ${aytName} açılmaz`)
    }
    if (status === "zaman_kalirsa") overflowCount += 1

    const start = ex ? input.today : (s?.start ?? examPeriodStart)
    const end = ex ? ex.son_tarih : s?.end && s.end <= examPeriodStart ? s.end : examPeriodStart
    items.push({
      topic_id: id,
      topic_name: t.topic_name,
      subject_id: t.subject_id,
      subject_name: t.subject_name,
      score: round1(base.get(id) ?? 0),
      block_type: g.bt,
      target_questions: g.q,
      target_accuracy: g.acc,
      need_minutes: g.need,
      wave: ex ? 1 : s?.start ? Math.floor(daysBetweenIso(input.today, s.start) / 7) + 1 : 0,
      plan_order: i + 1,
      start,
      end: end < start ? start : end,
      status,
      reasons,
      prereqs: prereqsOf.get(id) ?? [],
      existing: ex ? { assignment_id: ex.assignment_id, source: ex.source } : null,
      learning_phase: g.phase,
      gate,
      efficiency: base.get(id) ?? 0,
      priority: effScore.get(id) ?? 0,
      ...(gatedAyt?.length ? { gate_for: byId.get(gatedAyt[0])?.subject_name } : {}),
    })
  })

  // Sürekli pratik konuları: hep aktif, sınava kadar; öğrenme aşaması gerekiyorsa önce o.
  for (const t of practiceTopics) {
    const grp = practiceGroupOf(t.subject_name, t.topic_name)!
    const g = goal(t)
    const ex = existingByTopic.get(t.topic_id) ?? null
    items.unshift({
      topic_id: t.topic_id,
      topic_name: t.topic_name,
      subject_id: t.subject_id,
      subject_name: t.subject_name,
      score: round1(effOf(t)),
      block_type: "soru_cozum",
      target_questions: grp.blocksPerWeek * grp.questionsPerBlock,
      target_accuracy: g.acc,
      need_minutes: 0,
      wave: 1,
      plan_order: 0,
      start: input.today,
      end: input.examDate,
      status: "aktif",
      reasons: [
        `Sürekli pratik (${grp.label}): sınava kadar her hafta ${grp.blocksPerWeek} × ${grp.questionsPerBlock} soru; tamamlanıp çıkmaz`,
        ...(g.phase === "gerekli" ? [`Önce konuyu öğren, sonra haftalık pratik başlar`] : []),
      ],
      prereqs: [],
      existing: ex ? { assignment_id: ex.assignment_id, source: ex.source } : null,
      learning_phase: g.phase,
      gate: [],
      efficiency: effOf(t),
      practice: true,
    })
  }
  items.forEach((it, i) => (it.plan_order = i + 1))
  // Başlayamayan (zaman kalırsa) konular en sona.
  const lastWave = Math.max(1, ...items.map((i) => i.wave))
  for (const it of items) if (it.wave === 0) it.wave = lastWave + 1

  if (inExamPeriod) notes.push("Deneme dönemindesin: yeni konu açılmıyor; deneme, tekrar ve açık kapatma öncelikli.")
  const gated = Array.from(gates.entries()).some(([sid, g]) => g.length > 0 && topics.some((t) => t.subject_id === sid))
  if (gated && !inExamPeriod) {
    notes.push(
      `AYT konuları, ilgili TYT dersinin temel konularını bitirince açılır; en geç ${aytForceStart.split("-").reverse().join(".")} tarihinde (sınava ${AYT_FORCE_START_WEEKS} hafta kala) TYT ile paralel başlar.`,
    )
  }

  // Ders bazlı saat: plana giren konuların ihtiyacı + sürekli pratik (deneme dönemine kadar).
  const hoursBySubject = new Map<string, { subject_id: string; subject_name: string; minutes: number }>()
  const addMin = (sid: string, name: string, m: number) => {
    const cur = hoursBySubject.get(sid) ?? { subject_id: sid, subject_name: name, minutes: 0 }
    cur.minutes += m
    hoursBySubject.set(sid, cur)
  }
  for (const it of items) if (!it.practice && it.status !== "zaman_kalirsa") addMin(it.subject_id, it.subject_name, it.need_minutes)
  const practiceWeeks = Math.max(daysBetweenIso(input.today, examPeriodStart), 0) / 7
  for (const grp of practiceGroups) {
    const t = practiceTopics.find((x) => x.subject_name === grp.subject)!
    addMin(t.subject_id, t.subject_name, grp.blocksPerWeek * grp.questionsPerBlock * input.minutesPerQuestion * practiceWeeks)
  }
  const subjectHours = Array.from(hoursBySubject.values())
    .map((h) => ({ subject_id: h.subject_id, subject_name: h.subject_name, hours: Math.round(h.minutes / 60) }))
    .filter((h) => h.hours > 0)
    .sort((a, b) => b.hours - a.hours)

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
    aytForceStart,
    subjectHours,
    weeklyHours: inExamPeriod ? undefined : weeklyHours,
  }
}

/** Zamanında mı? Geçen süre oranı ile ilerleme oranı karşılaştırması. */
export function paceStatus(opts: { start: string; end: string; today: string; solved: number; target: number | null }): "zamaninda" | "geride" {
  if (!opts.target) return "zamaninda"
  const total = Math.max(daysBetweenIso(opts.start, opts.end), 1)
  const elapsed = clamp(daysBetweenIso(opts.start, opts.today), 0, total)
  return opts.solved / opts.target >= elapsed / total - PACE_TOLERANCE ? "zamaninda" : "geride"
}
