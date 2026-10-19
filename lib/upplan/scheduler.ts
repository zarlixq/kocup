import {
  BREAK_MINUTES,
  GRID_START_HOUR,
  KONU_CALISMA_QUESTION_SHARE,
  LECTURE_MINUTES,
  MAX_REVIEW_BLOCKS_PER_WEEK,
  MAX_SUBJECT_BLOCKS_PER_DAY,
  PRACTICE_EXAM_DAYS,
  PRACTICE_EXAM_MINUTES,
  REVIEW_BLOCK_QUESTIONS,
  SLOT_MINUTES,
  type BlockType,
} from "@/lib/upplan/config"
import { addDaysIso, daysBetweenIso, practiceExamsPerWeek, type Segment } from "@/lib/upplan/roadmap"

// UpPlan haftalık program yerleştirici — saf fonksiyon (LLM yok, test edilir).
//
// 1) Müsaitlik ızgarasından boş aralıklar; öğrencinin/koçun mevcut saatli kalemleri çıkarılır.
// 2) Denemeler (sınava kalan süreye göre haftada 1-3) tercihen hafta sonu sabahı.
// 3) Kalan aralıklar odak süresi uzunluğunda bloklara bölünür (aralarda mola);
//    yük çarpanı kadarı kullanılır.
// 4) Blok ihtiyacı = kalan soru × soru başı süre (+ konu anlatımı); bitişe kalan
//    güne göre bu haftaya düşen pay; aciliyeti yüksek hedef daha çok blok alır.
// 5) Yerleştirme: günde aynı dersten en fazla 2 blok; konu çalışması günün ilk
//    bloğuna; tekrar bloğu vadesinden önce konmaz.

export type ProgramGoal = {
  assignment_id: string
  topic_id: string
  topic_name: string
  subject_id: string
  subject_name: string
  block_type: BlockType
  remaining_questions: number
  /** Konu anlatımı henüz yapılmadı (konu_calisma, ilerleme 0). */
  lecture_pending: boolean
  son_tarih: string
  /** Bu hafta zaten bu hedefe bağlı yerleşmiş blok sayısı. */
  scheduled_blocks: number
}

export type ProgramReview = {
  topic_id: string
  topic_name: string
  subject_id: string
  subject_name: string
  /** Bu tarihten önce konmaz. */
  due: string
  reason: "aralikli" | "unutma"
}

export type FixedItem = { day_of_week: number; start_time: string; end_time: string }

export type DraftItem = {
  day_of_week: number
  start_time: string
  end_time: string
  subject_id: string | null
  topic_id: string | null
  assignment_id: string | null
  block_type: BlockType | "deneme"
  baslik: string
  hedef_soru: number | null
}

export type ScheduleInput = {
  weekStart: string
  /** Bu tarihten önceki günlere blok konmaz (içinde bulunulan hafta). */
  today: string
  availability: Record<string, number[]>
  focusMinutes: number
  loadFactor: number
  segment: Segment
  weeksLeft: number
  minutesPerQuestion: number
  goals: ProgramGoal[]
  reviews: ProgramReview[]
  fixed: FixedItem[]
}

export type ScheduleResult = {
  items: DraftItem[]
  meta: { examCount: number; blockCount: number; capacityBlocks: number; unplaced: number; studyMinutes: number }
}

// ── Zaman yardımcıları ──────────────────────────────────────────────────
export function toHHMM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`
}

export function fromHHMM(s: string): number {
  const [h, m] = s.split(":").map(Number)
  return h * 60 + (m || 0)
}

type Interval = [number, number]

/** Slot indeksleri → dakika aralıkları (ardışık slotlar birleşir). */
export function slotsToIntervals(slots: number[]): Interval[] {
  const sorted = Array.from(new Set(slots)).sort((a, b) => a - b)
  const out: Interval[] = []
  for (const s of sorted) {
    const start = GRID_START_HOUR * 60 + s * SLOT_MINUTES
    const last = out[out.length - 1]
    if (last && last[1] === start) last[1] = start + SLOT_MINUTES
    else out.push([start, start + SLOT_MINUTES])
  }
  return out
}

export function subtractInterval(list: Interval[], cut: Interval): Interval[] {
  const out: Interval[] = []
  for (const [a, b] of list) {
    if (cut[1] <= a || cut[0] >= b) out.push([a, b])
    else {
      if (cut[0] > a) out.push([a, cut[0]])
      if (cut[1] < b) out.push([cut[1], b])
    }
  }
  return out
}

function reviewQuestions(focus: number, mpq: number) {
  return Math.min(REVIEW_BLOCK_QUESTIONS.max, Math.max(REVIEW_BLOCK_QUESTIONS.min, Math.round(focus / mpq)))
}

type Ticket =
  | { kind: "goal"; goal: ProgramGoal; lecture: boolean; urgency: number }
  | { kind: "review"; review: ProgramReview }

/**
 * Ders×gün yerleşim uygunluğu (kaynak→ders→gün→hedef akışı, min-cut): her gün alt kümesi D için
 * Σ_{d∈D} boş(d) + Σ_s min(kalan(s), Σ_{d∉D} hak(d,s)) ≥ Σ_s kalan(s). Gün ≤ 7 → en fazla 128 alt küme.
 */
function placeable(counts: Map<string, number>, days: { left: number; room: (subject: string) => number }[]): boolean {
  const subs = Array.from(counts).filter(([, n]) => n > 0)
  const total = subs.reduce((t, [, n]) => t + n, 0)
  for (let mask = 0; mask < 1 << days.length; mask++) {
    let cut = 0
    days.forEach((d, i) => {
      if (mask & (1 << i)) cut += d.left
    })
    for (const [s, n] of subs) {
      let room = 0
      days.forEach((d, i) => {
        if (!(mask & (1 << i))) room += d.room(s)
      })
      cut += Math.min(n, room)
    }
    if (cut < total) return false
  }
  return true
}

// ── Ana fonksiyon ───────────────────────────────────────────────────────
export function scheduleWeek(input: ScheduleInput): ScheduleResult {
  const focus = input.focusMinutes
  const mpq = input.minutesPerQuestion
  const free = new Map<number, Interval[]>()
  for (let d = 1; d <= 7; d++) {
    const date = addDaysIso(input.weekStart, d - 1)
    if (date < input.today) continue
    let iv = slotsToIntervals(input.availability[String(d)] ?? [])
    for (const f of input.fixed.filter((x) => x.day_of_week === d)) iv = subtractInterval(iv, [fromHHMM(f.start_time), fromHHMM(f.end_time)])
    free.set(d, iv)
  }

  const items: DraftItem[] = []

  // 2) Denemeler.
  const examCount = practiceExamsPerWeek(input.weeksLeft)
  const examLen = PRACTICE_EXAM_MINUTES[input.segment]
  const dayOrder = [...PRACTICE_EXAM_DAYS, ...[1, 2, 3, 4, 5, 6, 7].filter((d) => !(PRACTICE_EXAM_DAYS as readonly number[]).includes(d))]
  let placedExams = 0
  for (const d of dayOrder) {
    if (placedExams >= examCount) break
    const iv = free.get(d)
    const slot = iv?.find(([a, b]) => b - a >= examLen)
    if (!iv || !slot) continue
    const cut: Interval = [slot[0], slot[0] + examLen]
    items.push({
      day_of_week: d,
      start_time: toHHMM(cut[0]),
      end_time: toHHMM(cut[1]),
      subject_id: null,
      topic_id: null,
      assignment_id: null,
      block_type: "deneme",
      baslik: "Deneme sınavı",
      hedef_soru: null,
    })
    free.set(d, subtractInterval(iv, [cut[0], cut[1] + BREAK_MINUTES]))
    placedExams += 1
  }

  // 3) Blok pozisyonları.
  const positions: { day: number; start: number; first: boolean }[] = []
  for (const [d, iv] of Array.from(free.entries()).sort((a, b) => a[0] - b[0])) {
    let first = true
    for (const [a, b] of iv) {
      for (let t = a; t + focus <= b; t += focus + BREAK_MINUTES) {
        positions.push({ day: d, start: t, first })
        first = false
      }
    }
  }
  const capacityBlocks = Math.floor(positions.length * input.loadFactor)

  // 4) Talep → bilet.
  const tickets: Ticket[] = []
  for (const r of input.reviews.slice(0, MAX_REVIEW_BLOCKS_PER_WEEK)) tickets.push({ kind: "review", review: r })
  const demand = input.goals
    .map((g) => {
      const remainingMin = g.remaining_questions * mpq + (g.lecture_pending ? LECTURE_MINUTES : 0)
      const daysLeft = Math.max(daysBetweenIso(input.weekStart < input.today ? input.today : input.weekStart, g.son_tarih) + 1, 1)
      const share = Math.min(1, 7 / daysLeft)
      const need = Math.max(Math.ceil((remainingMin * share) / focus) - g.scheduled_blocks, 0)
      const max = Math.max(Math.ceil(remainingMin / focus) - g.scheduled_blocks, 0)
      return { g, need: Math.min(need, max), urgency: share }
    })
    .filter((x) => x.need > 0)

  // Kapasite sınırlıysa aciliyet ağırlıklı dağıtım: her adımda urgency/(verilen+1) en büyük olana.
  // Günde dersten en fazla MAX_SUBJECT_BLOCKS_PER_DAY blok kuralıyla yerleşemeyecek bilet verilmez
  // (yoksa acil dersler kapasiteyi alır, biletler sığmaz, az acil ders boş kalır).
  const perDayPositions = new Map<number, number>()
  for (const p of positions) perDayPositions.set(p.day, (perDayPositions.get(p.day) ?? 0) + 1)
  const weekDays = Array.from(perDayPositions.values()).map((left) => ({ left, room: () => MAX_SUBJECT_BLOCKS_PER_DAY }))
  const subjectGiven = new Map<string, number>()
  for (const t of tickets) if (t.kind === "review") subjectGiven.set(t.review.subject_id, (subjectGiven.get(t.review.subject_id) ?? 0) + 1)
  const budget = Math.max(capacityBlocks - tickets.length, 0)
  const given = new Map<string, number>()
  for (let k = 0; k < budget; k++) {
    let best: (typeof demand)[number] | null = null
    let bestP = -1
    for (const x of demand) {
      const gv = given.get(x.g.assignment_id) ?? 0
      if (gv >= x.need) continue
      const p = x.urgency / (gv + 1)
      if (p <= bestP) continue
      const counts = new Map(subjectGiven).set(x.g.subject_id, (subjectGiven.get(x.g.subject_id) ?? 0) + 1)
      if (!placeable(counts, weekDays)) continue
      bestP = p
      best = x
    }
    if (!best) break
    given.set(best.g.assignment_id, (given.get(best.g.assignment_id) ?? 0) + 1)
    subjectGiven.set(best.g.subject_id, (subjectGiven.get(best.g.subject_id) ?? 0) + 1)
  }
  for (const x of demand) {
    const n = given.get(x.g.assignment_id) ?? 0
    for (let i = 0; i < n; i++) tickets.push({ kind: "goal", goal: x.g, lecture: x.g.lecture_pending && i === 0, urgency: x.urgency })
  }

  // 5) Yerleştirme.
  const perDaySubject = new Map<string, number>()
  const perDayGoal = new Map<string, number>()
  const subjectOf = (t: Ticket) => (t.kind === "goal" ? t.goal.subject_id : t.review.subject_id)
  const keyOf = (t: Ticket) => (t.kind === "goal" ? t.goal.assignment_id : `r:${t.review.topic_id}`)
  let remaining = [...tickets]
  const posLeft = new Map<number, number>()
  for (const p of positions) posLeft.set(p.day, (posLeft.get(p.day) ?? 0) + 1)
  for (const pos of positions) {
    if (remaining.length === 0) break
    posLeft.set(pos.day, posLeft.get(pos.day)! - 1)
    const date = addDaysIso(input.weekStart, pos.day - 1)
    let ok = remaining.filter((t) => {
      if ((perDaySubject.get(`${pos.day}:${subjectOf(t)}`) ?? 0) >= MAX_SUBJECT_BLOCKS_PER_DAY) return false
      if (t.kind === "review" && t.review.due > date) return false
      return true
    })
    if (ok.length === 0) continue
    // Kalan biletlerin sonraki pozisyonlara hâlâ sığabildiği dersler tercih edilir.
    const counts = new Map<string, number>()
    for (const t of remaining) counts.set(subjectOf(t), (counts.get(subjectOf(t)) ?? 0) + 1)
    const keeps = new Set<string>()
    for (const sub of new Set(ok.map(subjectOf))) {
      const used = (d: number, x: string) => (perDaySubject.get(`${d}:${x}`) ?? 0) + (d === pos.day && x === sub ? 1 : 0)
      const days = Array.from(posLeft, ([d, left]) => ({ left, room: (x: string) => Math.max(MAX_SUBJECT_BLOCKS_PER_DAY - used(d, x), 0) }))
      if (placeable(new Map(counts).set(sub, counts.get(sub)! - 1), days)) keeps.add(sub)
    }
    if (keeps.size) ok = ok.filter((t) => keeps.has(subjectOf(t)))
    const score = (t: Ticket) => {
      let s = t.kind === "review" ? 2 : t.urgency
      if (pos.first && t.kind === "goal" && t.goal.block_type === "konu_calisma") s += 10
      if (t.kind === "goal" && t.lecture) s += pos.first ? 5 : -5
      // Aynı hedefi aynı güne yığma.
      s -= (perDayGoal.get(`${pos.day}:${keyOf(t)}`) ?? 0) * 3
      return s
    }
    const pick = ok.reduce((a, b) => (score(b) > score(a) ? b : a))
    remaining = remaining.filter((t) => t !== pick)
    perDaySubject.set(`${pos.day}:${subjectOf(pick)}`, (perDaySubject.get(`${pos.day}:${subjectOf(pick)}`) ?? 0) + 1)
    perDayGoal.set(`${pos.day}:${keyOf(pick)}`, (perDayGoal.get(`${pos.day}:${keyOf(pick)}`) ?? 0) + 1)

    const start = toHHMM(pos.start)
    const end = toHHMM(pos.start + focus)
    if (pick.kind === "review") {
      items.push({
        day_of_week: pos.day,
        start_time: start,
        end_time: end,
        subject_id: pick.review.subject_id,
        topic_id: pick.review.topic_id,
        assignment_id: null,
        block_type: "tekrar",
        baslik: `Tekrar: ${pick.review.topic_name}`,
        hedef_soru: reviewQuestions(focus, mpq),
      })
    } else {
      const g = pick.goal
      const q = Math.max(1, Math.round((focus / mpq) * (pick.lecture ? KONU_CALISMA_QUESTION_SHARE : 1)))
      const prefix = pick.lecture ? "Konu çalışması" : g.block_type === "tekrar" ? "Tekrar" : "Soru çözümü"
      items.push({
        day_of_week: pos.day,
        start_time: start,
        end_time: end,
        subject_id: g.subject_id,
        topic_id: g.topic_id,
        assignment_id: g.assignment_id,
        block_type: pick.lecture ? "konu_calisma" : g.block_type,
        baslik: `${prefix}: ${g.topic_name}`,
        hedef_soru: Math.min(q, Math.max(g.remaining_questions, 1)),
      })
    }
  }

  items.sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
  const blocks = items.filter((i) => i.block_type !== "deneme")
  return {
    items,
    meta: {
      examCount: placedExams,
      blockCount: blocks.length,
      capacityBlocks,
      unplaced: remaining.length,
      studyMinutes: blocks.length * focus,
    },
  }
}

/** Aralıklı tekrar vadeleri: tamamlanma tarihinden +3, +7, +21 gün; bu haftaya düşenler. */
export function spacedReviewsDue(
  completed: { topic_id: string; completed_on: string }[],
  weekStart: string,
  offsets: readonly number[],
): { topic_id: string; due: string }[] {
  const weekEnd = addDaysIso(weekStart, 6)
  const out: { topic_id: string; due: string }[] = []
  for (const c of completed) {
    for (const o of offsets) {
      const due = addDaysIso(c.completed_on, o)
      if (due >= weekStart && due <= weekEnd) {
        out.push({ topic_id: c.topic_id, due })
        break
      }
    }
  }
  return out
}
