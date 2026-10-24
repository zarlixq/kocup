import {
  BREAK_MINUTES,
  GRID_START_HOUR,
  MAX_REVIEW_BLOCKS_PER_WEEK,
  MAX_SUBJECT_BLOCKS_PER_DAY,
  PRACTICE_EXAM_DAYS,
  PRACTICE_EXAM_MINUTES,
  SLOT_MINUTES,
  UPPLAN_TRACK_SQL_CONFIG as C,
  type BlockType,
} from "@/lib/upplan/config"
import { addDaysIso, daysBetweenIso, practiceExamsPerWeek, type Segment } from "@/lib/upplan/roadmap"
import { trackLimits, type Track } from "@/lib/upplan/track"

// UpPlan haftalık program yerleştirici — saf fonksiyon (LLM yok, test edilir).
//
// BÜTÇE ÖNCE, KONU SONRA (kurallar: WeekRules, katsayılar UPPLAN_TRACK_SQL_CONFIG):
//  1) Güvenlik limitleri: günlük üst sınır, okul günü ek çalışma sınırı (9-10: 2 saat),
//     haftada en az boş yarım gün; tatil haftasında yük çarpanı artar.
//  2) Deneme (YKS track'leri) hafta sonu sabahı; ERTESİ GÜN deneme analizi + yanlış defteri.
//  3) Günlük iskelet önce yerleşir (12/mezun: problem + paragraf soru blokları;
//     Maarif: kısa paragraf / problem alışkanlığı; 11 ve 2028+: bağlam temelli blok).
//  4) Kalan süre derslere paylaştırılır: pay = puan ağırlığı × ustalık açığı × sıralama
//     baskısı (servis hesaplar, subjectWeights). Alan dışı dersler toplamın en çok
//     lowvalue_cap_ratio'su ve kısa bloklar. Alanın ana AYT dersi haftada ≥ ayt_core_min_days gün.
//  5) Her ders payını öncelik sırasıyla konularıyla doldurur: konu (≤ odak süresi) ya da
//     video → 48 saat içinde aynı konunun SORU bloğu → aralıklı tekrar (kısa, 30 dk).
//     Soru bloğu süresi hedef soru × soru başı süreden; kısa tekrar 25-30 dk.
//  6) Oranlar: konu ≤ ratio_konu_max, soru ≥ ratio_soru_min, tekrar+analiz ≥ ratio_tekrar_min.
//  7) Yerleştirme: aynı ders günde ≤ 2 blok; ağır sayısal bloklar günün ilk yarısına,
//     alan dışı bloklar sona; dersler günlere yayılır.
//  8) Öğrenci/koç hedefi bonus alır ama sırayı ezmez; haftada en az bir blok garanti.
// Her blok kısa bir "neden" taşır (programda gösterilir).

export type ProgramGoal = {
  assignment_id: string
  topic_id: string
  topic_name: string
  subject_id: string
  subject_name: string
  block_type: BlockType
  remaining_questions: number
  /** Öğrenme aşamasında (konu öğrenilmedi) ve bu hafta konu çalışması yok → önce konu çalışması. */
  lecture_pending: boolean
  /** "Eksik" konu, opsiyonel kısa tekrar henüz yapılmadı (1 blok). */
  short_review_pending?: boolean
  son_tarih: string
  /** Bu hafta zaten bu hedefe bağlı yerleşmiş blok sayısı. */
  scheduled_blocks: number
  /** Yol haritası önceliği (verimlilik × bonuslar); yoksa aciliyet sırası. */
  priority?: number
  /** Öğrencinin/koçun eklediği hedef: bonus aldı, haftada en az bir blok garanti. */
  user_goal?: boolean
  /** Yol haritasındaki kısa gerekçe ("Neden bu blok?"). */
  reason?: string
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

export type FixedItem = {
  day_of_week: number
  start_time: string
  end_time: string
}

/** Sürekli pratik grubu (paragraf, problemler): günlük iskeletin konu kaynağı. */
export type PracticeGroupInput = {
  key: string
  label: string
  subject_id: string
  blocks: number
  questionsPerBlock: number
  /** Hazır (öğrenme aşaması bitmiş) konular, bu haftanın dönüş sırasıyla. */
  topics: { assignment_id: string; topic_id: string; topic_name: string }[]
}

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
  /** "Neden bu blok?" — kısa, insan dilinde gerekçe. */
  neden?: string
}

/**
 * Playlist planından o güne düşen videolar (Kaynaklarım → çalışma planı).
 * Süreleri o günün konu çalışması zamanına sayılır: ayrı "Video" bloğu olarak
 * müsaitlikten düşülür; eşlendiği konuların ayrı konu çalışması bloğu konmaz.
 */
export type VideoDay = {
  day_of_week: number
  minutes: number
  subject_id: string
  /** "55 Günde TYT Matematik Kampı (2 video)" */
  label: string
  /** Videoların eşlendiği konular (öneri + onaylı). */
  topic_ids: string[]
}

/** Konu sırasını playlist'in belirlediği konu (topic_id → bilgi). */
export type ProgramPlaylistTopic = {
  /** İlk videosu izlenmediyse plan tarihi; soru blokları bu günden önce yok. */
  notBefore: string | null
  /** Blok başlığı bağlamı: "Bıyıklı 3. Gün". */
  label: string
}

/** Günlük iskelet bloğu (konu blokları ondan sonra yerleşir). */
export type SkeletonSpec = {
  key: string
  /** Blok başlığı ("Paragraf soruları"). */
  label: string
  subject_id: string | null
  minutes: number
  /** Hangi günler (1=Pzt..7=Paz); müsaitliği olmayan gün atlanır. */
  days: number[]
  /** Dönüşümlü konu kaynağı (sürekli pratik konuları); yoksa konusuz blok. */
  topics: { assignment_id: string; topic_id: string; topic_name: string }[]
  block_type: BlockType
  neden: string
}

/** Track'e göre haftalık kurallar (weekRulesFor üretir). */
export type WeekRules = {
  track: Track | null
  /** Deneme planlanır mı (YKS track'leri). */
  exams: boolean
  dailyMax: number
  schoolDayMax: number
  freeHalfDays: number
  /** Bu hafta okul olan günler (1..5; tatil haftasında boş). */
  schoolDays: number[]
  /** Tatil haftası yük çarpanı (1 ya da holiday_load_multiplier). */
  holidayMultiplier: number
  skeleton: SkeletonSpec[]
  /** Alan dışı (kısa blok, süre tavanı) ders id'leri. */
  lowValueSubjects: string[]
  /** Ağır sayısal ders id'leri (günün ilk yarısı). */
  heavySubjects: string[]
  /** Alanın ana AYT dersi (haftada en az coreMinDays gün). */
  coreSubjectId: string | null
  coreMinDays: number
  ratios: { konuMax: number; soruMin: number; tekrarMin: number }
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
  /** Haftada zaten var olan deneme sayısı (eksik kalanı eklenir). */
  existingExams?: number
  /** Playlist planının bu haftaki video günleri. */
  videoDays?: VideoDay[]
  /** Konu sırasını playlist'in belirlediği konular. */
  playlistTopics?: Record<string, ProgramPlaylistTopic>
  rules: WeekRules
  /** Ders payı ağırlığı (subject_id → puan ağırlığı × açık × baskı). Yoksa hedef önceliklerinin toplamı. */
  subjectWeights?: Record<string, number>
}

export type WeekComposition = {
  konu: number
  soru: number
  tekrar: number
  analiz: number
  video: number
}

export type ScheduleResult = {
  items: DraftItem[]
  meta: {
    examCount: number
    blockCount: number
    capacityBlocks: number
    unplaced: number
    studyMinutes: number
    lectures: number
    /** Programa konan video süresi ve müsaitliğe sığmayan kısım (dk). */
    videoMinutes: number
    videoOverflowMinutes: number
    /** Süre dağılımı (dk) ve oranları. */
    composition: WeekComposition
    /** Ders bazlı dakika. */
    subjectMinutes: Record<string, number>
    /** Kural ihlalleri (test/debug; normalde boş). */
    warnings: string[]
  }
}

/** Video bloğu en az bu kadar (daha kısa boşluklara bölünmez). */
export const VIDEO_BLOCK_MIN_MINUTES = C.video_min_chunk_minutes

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

const total = (iv: Interval[]) => iv.reduce((n, [a, b]) => n + b - a, 0)

/** Aralıkları baştan itibaren en fazla `max` dakikaya kırpar. */
export function capIntervals(iv: Interval[], max: number): Interval[] {
  const out: Interval[] = []
  let left = max
  for (const [a, b] of iv) {
    if (left <= 0) break
    const len = Math.min(b - a, left)
    out.push([a, a + len])
    left -= len
  }
  return out
}

// ── Kurallar ────────────────────────────────────────────────────────────
export type WeekRulesParams = {
  track: Track | null
  /** Bu hafta okul olan günler (Pzt-Cum, tatil hariç). Mezunda boş. */
  schoolDays: number[]
  holiday: boolean
  skeleton: SkeletonSpec[]
  lowValueSubjects?: string[]
  heavySubjects?: string[]
  coreSubjectId?: string | null
}

/** Track → haftalık kurallar (limitler ve oranlar config'ten). */
export function weekRulesFor(p: WeekRulesParams): WeekRules {
  const lim = p.track ? trackLimits(p.track) : null
  const yks = p.track === "eski_12" || p.track === "maarif_12" || p.track === "mezun" || p.track === "lgs" || p.track === null
  return {
    track: p.track,
    exams: yks,
    dailyMax: lim?.dailyMax ?? 24 * 60,
    schoolDayMax: lim?.schoolDayMax ?? 24 * 60,
    freeHalfDays: lim?.freeHalfDays ?? 0,
    schoolDays: p.schoolDays,
    holidayMultiplier: p.holiday ? C.holiday_load_multiplier : 1,
    skeleton: p.skeleton,
    lowValueSubjects: p.lowValueSubjects ?? [],
    heavySubjects: p.heavySubjects ?? [],
    coreSubjectId: p.coreSubjectId ?? null,
    coreMinDays: C.ayt_core_min_days,
    ratios: {
      konuMax: C.ratio_konu_max,
      soruMin: C.ratio_soru_min,
      tekrarMin: C.ratio_tekrar_min,
    },
  }
}

/**
 * Günlük kullanılabilir aralıklar: geçmiş günler yok; sabit kalemler düşülür;
 * günlük / okul günü sınırı; en az boş yarım gün (en az müsait gün boşaltılır ya
 * da yarıya iner). Dönen: gün → aralıklar.
 */
export function usableDays(input: Pick<ScheduleInput, "weekStart" | "today" | "availability" | "fixed" | "rules">): Map<number, Interval[]> {
  const free = new Map<number, Interval[]>()
  for (let d = 1; d <= 7; d++) {
    const date = addDaysIso(input.weekStart, d - 1)
    if (date < input.today) continue
    let iv = slotsToIntervals(input.availability[String(d)] ?? [])
    for (const f of input.fixed.filter((x) => x.day_of_week === d)) iv = subtractInterval(iv, [fromHHMM(f.start_time), fromHHMM(f.end_time)])
    const cap = input.rules.schoolDays.includes(d) ? Math.min(input.rules.dailyMax, input.rules.schoolDayMax) : input.rules.dailyMax
    free.set(d, capIntervals(iv, cap))
  }
  // Boş yarım gün: hafta içinde zaten boş günler sayılır (tam gün = 2 yarım gün).
  let freeHalves = 0
  for (let d = 1; d <= 7; d++) if (total(free.get(d) ?? []) === 0) freeHalves += 2
  const busy = Array.from(free.entries())
    .filter(([, iv]) => total(iv) > 0)
    .sort((a, b) => total(a[1]) - total(b[1]) || b[0] - a[0])
  for (const [d, iv] of busy) {
    if (freeHalves >= input.rules.freeHalfDays) break
    const need = input.rules.freeHalfDays - freeHalves
    if (need >= 2) {
      free.set(d, [])
      freeHalves += 2
    } else {
      free.set(d, capIntervals(iv, Math.floor(total(iv) / 2)))
      freeHalves += 1
    }
  }
  return free
}

// ── Blok talepleri ──────────────────────────────────────────────────────
type Kind = "konu" | "video" | "soru" | "tekrar" | "analiz" | "iskelet"

type Req = {
  kind: Kind
  minutes: number
  subject_id: string | null
  topic_id: string | null
  assignment_id: string | null
  block_type: BlockType | "deneme"
  baslik: string
  hedef_soru: number | null
  neden: string
  /** Bu günden önce / sonra konmaz (1..7). */
  minDay: number
  maxDay: number
  /** Gün içi tercih. */
  part: "early" | "late" | "any"
  /** Aynı günde soru blokları bu dakikadan önce başlamaz (konu bitişi). */
  minStartOnMinDay?: number
}

type Placed = { day: number; start: number; end: number; req: Req }

const ratioOf = (n: number, d: number) => (d > 0 ? n / d : 0)

export function scheduleWeek(input: ScheduleInput): ScheduleResult {
  const rules = input.rules
  const focus = input.focusMinutes
  const mpq = input.minutesPerQuestion
  const warnings: string[] = []
  const free = usableDays(input)
  const firstDay = Math.max(1, daysBetweenIso(input.weekStart, input.today < input.weekStart ? input.weekStart : input.today) + 1)

  const placed: Placed[] = []
  const subjectDay = new Map<string, number>()
  const subjDayKey = (d: number, s: string | null) => `${d}:${s ?? "-"}`
  const capacityTotal = Array.from(free.values()).reduce((n, iv) => n + total(iv), 0)
  // Kullanılabilir süre: yük çarpanı (tatilde artar), müsaitliği aşamaz.
  const budgetTotal = Math.round(capacityTotal * Math.min(1, input.loadFactor * rules.holidayMultiplier))
  let used = 0
  // Oran paydası (denemeler yerleşince hesaplanır) ve tekrar payı rezervi: konu/video/soru
  // blokları tekrar + analiz için ayrılan süreyi tüketemez (tekrar dolgusundan sonra kalkar).
  let studyCap = Number.POSITIVE_INFINITY
  let reserveTekrar = true
  const tekrarTarget = () => (Number.isFinite(studyCap) ? Math.ceil(rules.ratios.tekrarMin * studyCap) : 0)
  const tekrarPlaced = () =>
    placed
      .filter((p) => (p.req.kind === "tekrar" || p.req.kind === "analiz") && p.req.block_type !== "deneme")
      .reduce((n, p) => n + p.end - p.start, 0)
  // Tekrar açığı kadar FİZİKSEL boşluk korunur (yalnız kısa tekrarın sığdığı boşluklar sayılır).
  const tekrarShortfall = () => Math.max(tekrarTarget() - tekrarPlaced(), 0)
  const usableFree = () => {
    let n = 0
    for (const [d, iv] of free) if (d >= firstDay) for (const [a, b] of iv) if (b - a >= C.short_review_min_minutes) n += b - a
    return n
  }

  /** Bir talebi uygun güne/saate yerleştirir; yer yoksa null. */
  const place = (input0: Req, opts: { force?: boolean; preferDays?: number[] } = {}): Placed | null => {
    let req = input0
    if (!opts.force && used + req.minutes > budgetTotal) return null
    if (
      reserveTekrar &&
      (req.kind === "konu" || req.kind === "video" || req.kind === "soru") &&
      usableFree() - req.minutes - BREAK_MINUTES < tekrarShortfall()
    ) {
      // Soru bloğu korunan boşluk dışında kalan süreye kısaltılabilir (en az soru_block_min_minutes).
      const allow = Math.floor((usableFree() - BREAK_MINUTES - tekrarShortfall()) / 5) * 5
      if (req.kind !== "soru" || allow < C.soru_block_min_minutes) return null
      req = { ...req, minutes: allow, hedef_soru: Math.max(1, Math.round(allow / mpq)) }
    }
    const days: number[] = []
    for (let d = Math.max(req.minDay, firstDay); d <= Math.min(req.maxDay, 7); d++) if (free.has(d)) days.push(d)
    // Ders aynı güne yığılmasın: o dersin en az olduğu, sonra en boş gün.
    const load = (d: number) => placed.filter((p) => p.day === d).reduce((n, p) => n + p.end - p.start, 0)
    const order = [...days].sort((a, b) => {
      const pa = opts.preferDays?.includes(a) ? 0 : 1
      const pb = opts.preferDays?.includes(b) ? 0 : 1
      return (
        pa - pb ||
        (subjectDay.get(subjDayKey(a, req.subject_id)) ?? 0) - (subjectDay.get(subjDayKey(b, req.subject_id)) ?? 0) ||
        load(a) - load(b) ||
        a - b
      )
    })
    for (const d of order) {
      // İskelet (kısa günlük alışkanlık) ders/gün sınırına sayılmaz.
      if (req.kind !== "iskelet" && req.subject_id && (subjectDay.get(subjDayKey(d, req.subject_id)) ?? 0) >= MAX_SUBJECT_BLOCKS_PER_DAY) continue
      const iv = free.get(d) ?? []
      const minStart = d === req.minDay ? (req.minStartOnMinDay ?? 0) : 0
      const fits = iv.map(([a, b]): Interval => [Math.max(a, minStart), b]).filter(([a, b]) => b - a >= req.minutes)
      if (!fits.length) continue
      const [a, b] = req.part === "late" ? fits[fits.length - 1] : fits[0]
      const start = req.part === "late" ? b - req.minutes : a
      const p: Placed = { day: d, start, end: start + req.minutes, req }
      placed.push(p)
      free.set(d, subtractInterval(iv, [start, start + req.minutes + BREAK_MINUTES]))
      if (req.kind !== "iskelet" && req.subject_id)
        subjectDay.set(subjDayKey(d, req.subject_id), (subjectDay.get(subjDayKey(d, req.subject_id)) ?? 0) + 1)
      used += req.minutes
      return p
    }
    return null
  }

  // ── 2) Deneme + ertesi gün analiz ──
  let placedExams = 0
  if (rules.exams) {
    const examCount = Math.max(practiceExamsPerWeek(input.weeksLeft) - (input.existingExams ?? 0), 0)
    const examLen = PRACTICE_EXAM_MINUTES[input.segment]
    const dayOrder = [...PRACTICE_EXAM_DAYS, ...[1, 2, 3, 4, 5, 6, 7].filter((d) => !(PRACTICE_EXAM_DAYS as readonly number[]).includes(d))]
    for (const d of dayOrder) {
      if (placedExams >= examCount) break
      const p = place(
        {
          kind: "analiz",
          minutes: examLen,
          subject_id: null,
          topic_id: null,
          assignment_id: null,
          block_type: "deneme",
          baslik: "Deneme sınavı",
          hedef_soru: null,
          neden: "Sınav provası: süre yönetimi ve hangi konuların eksik olduğunu gösterir",
          minDay: d,
          maxDay: d,
          part: "early",
        },
        { force: true },
      )
      if (!p) continue
      placedExams += 1
      used -= examLen // deneme süresi çalışma bütçesine sayılmaz
      // Ertesi gün analiz (Pazar denemesinde aynı gün, denemeden sonra).
      const next = d < 7 ? d + 1 : d
      const analysis = place(
        {
          kind: "analiz",
          minutes: C.exam_analysis_minutes,
          subject_id: null,
          topic_id: null,
          assignment_id: null,
          block_type: "tekrar",
          baslik: "Deneme analizi + yanlış defteri",
          hedef_soru: null,
          neden: "Denemenin ertesi günü: yanlışları sınıflandır, yanlış defterine yaz; zayıf konular gelecek haftanın önceliğine girer",
          minDay: next,
          maxDay: Math.min(next + 1, 7),
          part: "early",
          ...(next === d ? { minStartOnMinDay: p.end } : {}),
        },
        { force: true },
      )
      if (!analysis) warnings.push("deneme analizi yerleşmedi")
    }
  }

  // Oranların paydası: denemeden sonra kalan bütçenin bloklara düşen kısmı (molalar
  // düşülür; ortalama blok ≈ (odak + iskelet bloğu) / 2).
  const examMinutes = placed.filter((p) => p.req.block_type === "deneme").reduce((n, p) => n + p.end - p.start, 0)
  const avgBlock = (focus + C.skeleton_paragraf_minutes) / 2
  studyCap = Math.round((Math.max(budgetTotal - examMinutes, 0) * avgBlock) / (avgBlock + BREAK_MINUTES))

  // ── 3) Günlük iskelet ──
  for (const sk of rules.skeleton) {
    let k = 0
    for (const d of sk.days) {
      if (d < firstDay || total(free.get(d) ?? []) < sk.minutes) continue
      const t = sk.topics.length ? sk.topics[k % sk.topics.length] : null
      const p = place({
        kind: "iskelet",
        minutes: sk.minutes,
        subject_id: sk.subject_id,
        topic_id: t?.topic_id ?? null,
        assignment_id: t?.assignment_id ?? null,
        block_type: sk.block_type,
        baslik: t ? `${sk.label}: ${t.topic_name}` : sk.label,
        hedef_soru: sk.block_type === "konu_calisma" ? null : Math.max(1, Math.round(sk.minutes / mpq)),
        neden: sk.neden,
        minDay: d,
        maxDay: d,
        part: "late",
      })
      if (p) k += 1
    }
  }

  // ── 4) Ders payları ──
  const studyBudget = Math.max(budgetTotal - used, 0)
  const goals = [...input.goals].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
  const subjects = Array.from(new Set([...goals.map((g) => g.subject_id), ...input.reviews.map((r) => r.subject_id)]))
  const weightOf = (s: string) =>
    input.subjectWeights?.[s] ?? goals.filter((g) => g.subject_id === s).reduce((n, g) => n + Math.max(g.priority ?? 1, 0.01), 0)
  const low = new Set(rules.lowValueSubjects)
  const totalW = subjects.reduce((n, s) => n + Math.max(weightOf(s), 0), 0)
  const share = new Map<string, number>()
  for (const s of subjects) share.set(s, totalW > 0 ? (studyBudget * Math.max(weightOf(s), 0)) / totalW : studyBudget / Math.max(subjects.length, 1))
  // Alan dışı tavanı: fazlası diğer derslere ağırlıklarıyla dağıtılır.
  const lowCap = Math.floor(budgetTotal * C.lowvalue_cap_ratio)
  const lowSum = subjects.filter((s) => low.has(s)).reduce((n, s) => n + share.get(s)!, 0)
  if (lowSum > lowCap) {
    const scale = lowCap / lowSum
    const freed = lowSum - lowCap
    const hiW = subjects.filter((s) => !low.has(s)).reduce((n, s) => n + Math.max(weightOf(s), 0), 0)
    for (const s of subjects) {
      if (low.has(s)) share.set(s, share.get(s)! * scale)
      else if (hiW > 0) share.set(s, share.get(s)! + (freed * Math.max(weightOf(s), 0)) / hiW)
    }
  }
  const spent = new Map<string, number>()
  const spend = (s: string | null, m: number) => s && spent.set(s, (spent.get(s) ?? 0) + m)
  const left = (s: string) => (share.get(s) ?? 0) - (spent.get(s) ?? 0)
  const lowSpent = () =>
    Array.from(spent)
      .filter(([s]) => low.has(s))
      .reduce((n, [, m]) => n + m, 0)

  const blockLen = (subject: string, ideal: number) =>
    low.has(subject)
      ? Math.min(Math.max(ideal, C.lowvalue_block_min), C.lowvalue_block_max)
      : Math.min(Math.max(ideal, C.soru_block_min_minutes), focus)
  const soruReq = (g: ProgramGoal, minDay: number, maxDay: number, minStart?: number, why?: string): Req => {
    const len = blockLen(g.subject_id, Math.round((Math.max(g.remaining_questions, 1) * mpq) / 5) * 5)
    const pl = input.playlistTopics?.[g.topic_id]
    return {
      kind: "soru",
      minutes: len,
      subject_id: g.subject_id,
      topic_id: g.topic_id,
      assignment_id: g.assignment_id,
      block_type: g.block_type === "tekrar" ? "tekrar" : "soru_cozum",
      baslik: `${g.block_type === "tekrar" ? "Tekrar" : "Soru çözümü"}: ${g.topic_name}${pl ? ` (${pl.label})` : ""}`,
      hedef_soru: Math.max(1, Math.min(Math.round(len / mpq), Math.max(g.remaining_questions, 1))),
      neden: why ?? g.reason ?? `${g.subject_name}: önceliği yüksek konu`,
      minDay,
      maxDay,
      part: rules.heavySubjects.includes(g.subject_id) ? "early" : low.has(g.subject_id) ? "late" : "any",
      ...(minStart !== undefined ? { minStartOnMinDay: minStart } : {}),
    }
  }
  /** Soru bloğu: tam boy sığmazsa yarı uzunlukta (en az soru_block_min_minutes). */
  const placeSoru = (req: Req): Placed | null => {
    const half = Math.max(Math.floor(req.minutes / 2 / 5) * 5, C.soru_block_min_minutes)
    return place(req) ?? (half < req.minutes ? place({ ...req, minutes: half, hedef_soru: Math.max(1, Math.round(half / mpq)) }) : null)
  }
  const konuMax = () => Math.floor(studyCap * rules.ratios.konuMax)
  const konuUsed = () => placed.filter((p) => p.req.kind === "konu" || p.req.kind === "video").reduce((n, p) => n + p.end - p.start, 0)

  // ── 5a) Konu / video → 48 saat içinde soru ──
  const gap = C.konu_soru_max_gap_days
  let lectures = 0
  const noLecture = new Set<string>()
  const goalBlocks = new Map<string, number>()
  const bumpGoal = (id: string) => goalBlocks.set(id, (goalBlocks.get(id) ?? 0) + 1)
  let videoMinutes = 0
  let videoOverflow = 0
  const videoDone = new Map<string, { day: number; end: number }>()
  const planGoal = (g: ProgramGoal) => {
    const pl = input.playlistTopics?.[g.topic_id]
    const vd = videoDone.get(g.topic_id)
    if (vd) {
      // Video tek başına "tamamlandı" sayılmaz: arkasından soru.
      const s = placeSoru(soruReq(g, vd.day, vd.day + gap, vd.end, "Videodan sonraki 48 saat içinde: izlediğini soruyla pekiştir"))
      if (s) {
        spend(g.subject_id, s.end - s.start)
        bumpGoal(g.assignment_id)
      }
      lectures += 1
      return
    }
    if (pl) {
      // Playlist konusu: konu bloğu yok (konusu videodur); soru ilk videonun plan gününden önce yok.
      const nb = pl.notBefore ? Math.max(daysBetweenIso(input.weekStart, pl.notBefore) + 1, firstDay) : firstDay
      if (nb > 7) {
        noLecture.add(g.assignment_id)
        return
      }
      if (g.remaining_questions <= 0) return
      const s = placeSoru(soruReq(g, nb, 7))
      if (s) {
        spend(g.subject_id, s.end - s.start)
        bumpGoal(g.assignment_id)
      }
      return
    }
    if (!g.lecture_pending && !g.short_review_pending) return
    if (left(g.subject_id) <= 0 && !g.user_goal) return
    if (g.short_review_pending && !g.lecture_pending) {
      const p = place({
        kind: "tekrar",
        minutes: low.has(g.subject_id) ? Math.min(C.short_review_minutes, C.lowvalue_block_max) : C.short_review_minutes,
        subject_id: g.subject_id,
        topic_id: g.topic_id,
        assignment_id: g.assignment_id,
        block_type: "tekrar",
        baslik: `Kısa konu tekrarı: ${g.topic_name}`,
        hedef_soru: null,
        neden: "Eksik dediğin konu: kısa özet tekrarı, sonra soru",
        minDay: firstDay,
        maxDay: 7,
        part: low.has(g.subject_id) ? "late" : "any",
      })
      if (p) {
        spend(g.subject_id, p.end - p.start)
        bumpGoal(g.assignment_id)
      }
      return
    }
    const len = low.has(g.subject_id) ? C.lowvalue_block_max : focus
    if (konuUsed() + len > konuMax()) {
      noLecture.add(g.assignment_id)
      return
    }
    // Konu, ardından 48 saat içinde soru yerleşebilecek ilk gün.
    let ok = false
    for (let d = firstDay; d <= 7 && !ok; d++) {
      const k = place({
        kind: "konu",
        minutes: len,
        subject_id: g.subject_id,
        topic_id: g.topic_id,
        assignment_id: g.assignment_id,
        block_type: "konu_calisma",
        baslik: `Konu çalışması: ${g.topic_name}`,
        hedef_soru: null,
        neden: g.reason ?? `${g.subject_name}: öncelikli ve henüz öğrenmediğin konu`,
        minDay: d,
        maxDay: d,
        part: rules.heavySubjects.includes(g.subject_id) ? "early" : "any",
      })
      if (!k) continue
      const s = placeSoru(soruReq(g, k.day, k.day + gap, k.end, "Konu çalışmasından sonraki 48 saat içinde: öğrendiğini soruyla pekiştir"))
      if (!s) {
        // Soru yerleşmiyorsa konu da yok (konu tek başına bırakılmaz).
        unplace(k)
        continue
      }
      spend(g.subject_id, k.end - k.start + s.end - s.start)
      bumpGoal(g.assignment_id)
      bumpGoal(g.assignment_id)
      lectures += 1
      ok = true
    }
    if (!ok) noLecture.add(g.assignment_id)
  }
  // Önce alanın ana dersinin konu blokları (konu payından öncelikli yer), sonra
  // playlist videoları, sonra diğer konular — hepsi öncelik sırasıyla.
  const isCore = (g: ProgramGoal) => g.subject_id === rules.coreSubjectId && !input.playlistTopics?.[g.topic_id]
  for (const g of goals.filter(isCore)) planGoal(g)
  // ── 5b) Alanın ana AYT dersi: haftada en az coreMinDays gün ──
  if (rules.coreSubjectId) {
    const core = goals.filter((g) => g.subject_id === rules.coreSubjectId && !noLecture.has(g.assignment_id) && g.remaining_questions > 0)
    const coreDays = () => new Set(placed.filter((p) => p.req.subject_id === rules.coreSubjectId).map((p) => p.day))
    let i = 0
    let guard = 0
    while (core.length && coreDays().size < rules.coreMinDays && guard++ < 14) {
      const g = core[i % core.length]
      i += 1
      const missing = [1, 2, 3, 4, 5, 6, 7].filter((d) => d >= firstDay && !coreDays().has(d))
      const before = coreDays().size
      for (const d of missing) {
        const s = placeSoru(
          soruReq(g, d, d, undefined, `${g.subject_name} haftada en az ${rules.coreMinDays} gün: alanının en çok puan getiren dersi`),
        )
        if (s) {
          spend(g.subject_id, s.end - s.start)
          bumpGoal(g.assignment_id)
          break
        }
      }
      if (coreDays().size === before) break
    }
    if (core.length && coreDays().size < rules.coreMinDays) warnings.push(`ana ders ${coreDays().size} gün`)
  }

  // ── 5a-2) Video günleri: 20 dk altı parça aynı dersin sonraki video gününe birleşir ──
  const videoDays = mergeVideoDays(input.videoDays ?? [], firstDay)
  for (const vd of videoDays) {
    const minutes = Math.ceil(vd.minutes / 5) * 5
    if (minutes <= 0 || !free.has(vd.day_of_week)) continue
    // Tek video bloğu: günün en uzun boşluğuna ve haftalık konu payına (ratio_konu_max)
    // sığdığı kadar; kalanı taşma (playlist planı kaydırılır).
    const longest = Math.max(0, ...(free.get(vd.day_of_week) ?? []).map(([a, b]) => b - a))
    // Video da dersin payından yer: payı biten dersin videosu taşar (playlist kaydırılır).
    const subjectRoom = share.has(vd.subject_id) ? Math.max(left(vd.subject_id), 0) : Number.POSITIVE_INFINITY
    const room = Math.floor(Math.min(longest, konuMax() - konuUsed(), focus, subjectRoom) / 5) * 5
    if (room < C.video_min_chunk_minutes) {
      videoOverflow += minutes
      continue
    }
    const p = place(
      {
        kind: "video",
        minutes: Math.min(minutes, room),
        subject_id: vd.subject_id,
        topic_id: vd.topic_ids.length === 1 ? vd.topic_ids[0] : null,
        assignment_id: null,
        block_type: "konu_calisma",
        baslik: `Video: ${vd.label}`,
        hedef_soru: null,
        neden: "Playlist planındaki videolar; arkasından 48 saat içinde aynı konunun soruları gelir",
        minDay: vd.day_of_week,
        maxDay: vd.day_of_week,
        part: "late",
      },
      { force: true },
    )
    if (!p) {
      videoOverflow += minutes
      continue
    }
    videoMinutes += p.end - p.start
    spend(vd.subject_id, p.end - p.start)
    videoOverflow += Math.max(minutes - (p.end - p.start), 0)
    for (const t of vd.topic_ids) if (!videoDone.has(t)) videoDone.set(t, { day: p.day, end: p.end })
  }

  for (const g of goals.filter((x) => !isCore(x))) planGoal(g)

  /** Boş aralığı güne geri ekler (komşularla birleşir). */
  function release(day: number, iv: Interval) {
    const all = [...(free.get(day) ?? []), iv].sort((a, b) => a[0] - b[0])
    const merged: Interval[] = []
    for (const [a, b] of all) {
      const last = merged[merged.length - 1]
      if (last && a <= last[1]) last[1] = Math.max(last[1], b)
      else merged.push([a, b])
    }
    free.set(day, merged)
  }

  function unplace(p: Placed) {
    const i = placed.indexOf(p)
    if (i < 0) return
    placed.splice(i, 1)
    used -= p.end - p.start
    if (p.req.subject_id) subjectDay.set(subjDayKey(p.day, p.req.subject_id), (subjectDay.get(subjDayKey(p.day, p.req.subject_id)) ?? 1) - 1)
    release(p.day, [p.start, p.end + BREAK_MINUTES])
  }

  // ── 5c) Öğrenci/koç hedefi: haftada en az bir blok ──
  for (const g of goals.filter(
    (x) => x.user_goal && !noLecture.has(x.assignment_id) && !goalBlocks.has(x.assignment_id) && x.remaining_questions > 0,
  )) {
    const s = placeSoru(soruReq(g, firstDay, 7, undefined, "Kendi eklediğin hedef: bu hafta en az bir blok"))
    if (s) {
      spend(g.subject_id, s.end - s.start)
      bumpGoal(g.assignment_id)
    }
  }

  // ── 5d) Tekrarlar (aralıklı / unutma): kısa blok, vadesinden önce yok ──
  for (const r of input.reviews.slice(0, MAX_REVIEW_BLOCKS_PER_WEEK)) {
    const dueDay = Math.max(daysBetweenIso(input.weekStart, r.due) + 1, firstDay)
    const p = place({
      kind: "tekrar",
      minutes: C.short_review_minutes,
      subject_id: r.subject_id,
      topic_id: r.topic_id,
      assignment_id: null,
      block_type: "tekrar",
      baslik: `Tekrar: ${r.topic_name}`,
      hedef_soru: Math.max(1, Math.round(C.short_review_minutes / mpq)),
      neden: r.reason === "aralikli" ? "Aralıklı tekrar (7. / 21. gün): unutmayı önler" : "Ustalığın düşmeye başladı: kısa tekrar",
      minDay: dueDay,
      maxDay: 7,
      part: "late",
    })
    if (p) spend(r.subject_id, p.end - p.start)
  }

  // ── 5e) Oran: tekrar + analiz ≥ tekrarMin, soru bloklarından ÖNCE (karma tekrar: bu hafta çalışılan konular) ──
  const studied = goals.filter((g) => goalBlocks.has(g.assignment_id) && !low.has(g.subject_id))
  let ti = 0
  while (studied.length && tekrarPlaced() < rules.ratios.tekrarMin * studyCap && ti < studied.length * 2) {
    const g = studied[ti % studied.length]
    ti += 1
    // Önce konu/soru bloğundan sonraki bir güne, yoksa haftanın kalanına.
    const firstOf = placed.filter((p) => p.req.assignment_id === g.assignment_id).reduce((m, p) => Math.min(m, p.day), 8)
    // Ertesi günlerden biri, olmazsa aynı gün (sonra); 30 dk sığmazsa en kısa tekrar süresiyle.
    let p: Placed | null = null
    for (const [minDay, minutes] of [
      [Math.min(firstOf + 1, 7), C.short_review_minutes],
      [firstOf, C.short_review_minutes],
      [firstOf, C.short_review_min_minutes],
    ] as const) {
      p = place({
        kind: "tekrar",
        minutes,
        subject_id: g.subject_id,
        topic_id: g.topic_id,
        assignment_id: g.assignment_id,
        block_type: "tekrar",
        baslik: `Tekrar: ${g.topic_name}`,
        hedef_soru: Math.max(1, Math.round(minutes / mpq)),
        neden: "Bu hafta çalıştığın konunun kısa tekrarı: kalıcılık için",
        minDay,
        maxDay: 7,
        part: "late",
      })
      if (p) break
    }
    if (!p) continue
    spend(g.subject_id, p.end - p.start)
  }

  // Tekrar dolgusu bitti: kalan süre soru bloklarına açılır.
  reserveTekrar = false

  // ── 5f) Soru blokları: ders payı bitene dek, öncelik sırasıyla ──
  const demand = goals.filter((g) => !noLecture.has(g.assignment_id) && g.remaining_questions > 0)
  const soruTarget = () => placed.filter((p) => p.req.kind === "soru" || p.req.kind === "iskelet").reduce((n, p) => n + p.end - p.start, 0)
  // Önce ders payları içinde (dönüşümlü), sonra kalan süre payı aşarak (alan dışı tavanı korunur).
  const maxBlocksOf = (g: ProgramGoal) => Math.max(Math.ceil((g.remaining_questions * mpq) / Math.max(focus, 1)) - g.scheduled_blocks, 0)
  const wantsMore = (g: ProgramGoal) => (goalBlocks.get(g.assignment_id) ?? 0) < maxBlocksOf(g)
  const fillSoru = (onlySoru = false) => {
    for (const phase of ["pay", "serbest"] as const) {
      let any = true
      while (any) {
        any = false
        for (const g of demand) {
          // Denge geçişinde yalnız soru tipli bloklar (tekrar şablonlu hedef değil).
          if (onlySoru && g.block_type === "tekrar") continue
          if (used >= budgetTotal) break
          const cap = low.has(g.subject_id) ? Math.max(Math.min(left(g.subject_id), lowCap - lowSpent()), 0) : left(g.subject_id)
          if (phase === "pay" && cap < C.soru_block_min_minutes) continue
          if (low.has(g.subject_id) && lowSpent() >= lowCap) continue
          const pl = input.playlistTopics?.[g.topic_id]
          // Konu çalışması yerleşemeyen (öğrenme bekleyen) konuya soru yok; playlist konusunun konusu videodur.
          if (g.lecture_pending && !pl && !videoDone.has(g.topic_id) && !(goalBlocks.get(g.assignment_id) ?? 0)) continue
          const nb = pl?.notBefore ? Math.max(daysBetweenIso(input.weekStart, pl.notBefore) + 1, firstDay) : firstDay
          if (nb > 7) continue
          if (!wantsMore(g)) continue
          // Tam blok sığmazsa yarı uzunlukta (en az soru_block_min_minutes) tekrar dene.
          const s = placeSoru(soruReq(g, nb, 7))
          if (s) {
            spend(g.subject_id, s.end - s.start)
            bumpGoal(g.assignment_id)
            any = true
          }
        }
      }
    }
  }
  fillSoru()

  // Son denge geçişi: konu payı aşıldıysa ya da soru payı hedefin altındaysa en son video
  // bloklarını 5'er dk kısalt (en az video_min_chunk_minutes; kalan taşma), açılan yere soru doldur.
  const studyNow = () => placed.filter((p) => p.req.block_type !== "deneme").reduce((n, p) => n + p.end - p.start, 0)
  const soruNow = () =>
    placed
      .filter((p) => (p.req.kind === "soru" || p.req.kind === "iskelet") && p.req.block_type !== "tekrar")
      .reduce((n, p) => n + p.end - p.start, 0)
  const trimVideos = (over: () => boolean) => {
    for (const v of [...placed].filter((p) => p.req.kind === "video").sort((a, b) => b.day - a.day || b.start - a.start)) {
      while (over() && v.end - v.start - 5 >= C.video_min_chunk_minutes) {
        v.end -= 5
        used -= 5
        videoMinutes -= 5
        videoOverflow += 5
        release(v.day, [v.end + BREAK_MINUTES, v.end + 5 + BREAK_MINUTES])
      }
      if (!over()) break
    }
  }
  trimVideos(() => konuUsed() > rules.ratios.konuMax * studyNow())
  // Soru payı için yalnız karşılanmamış soru talebi varken (açılan yer boş kalmasın).
  const soruDemand = demand.some((g) => g.block_type !== "tekrar" && wantsMore(g) && !low.has(g.subject_id))
  if (soruDemand) trimVideos(() => soruNow() < rules.ratios.soruMin * studyNow())
  fillSoru(true)

  // Tekrar payı hâlâ düşükse: ana ders dışındaki en düşük öncelikli soru bloğu kısa tekrara
  // dönüşür (soru payı soruMin'in altına düşmeyecekse); kalan süre boşalır.
  const prioOf = new Map(goals.map((g) => [g.assignment_id, g.priority ?? 0]))
  for (let n = 0; n < 20 && tekrarPlaced() < rules.ratios.tekrarMin * studyNow(); n++) {
    const p = placed
      .filter((x) => x.req.kind === "soru" && x.req.block_type !== "tekrar" && x.req.subject_id !== rules.coreSubjectId)
      .sort((a, b) => (prioOf.get(a.req.assignment_id ?? "") ?? 0) - (prioOf.get(b.req.assignment_id ?? "") ?? 0))[0]
    if (!p) break
    const oldLen = p.end - p.start
    const len = Math.min(oldLen, C.short_review_minutes)
    if (soruNow() - oldLen < rules.ratios.soruMin * (studyNow() - (oldLen - len))) break
    const name = goals.find((g) => g.assignment_id === p.req.assignment_id)?.topic_name ?? ""
    p.req = { ...p.req, kind: "tekrar", block_type: "tekrar", baslik: `Tekrar: ${name}`, hedef_soru: Math.max(1, Math.round(len / mpq)), neden: "Haftalık tekrar payı: bu hafta çalıştığın konuyu pekiştir" }
    if (len < oldLen) {
      release(p.day, [p.start + len + BREAK_MINUTES, p.end + BREAK_MINUTES])
      used -= oldLen - len
      p.end = p.start + len
    }
  }

  // Oran kontrolleri (uyarı: test ve debug panelinde görünür).
  const study = () => placed.filter((p) => p.req.block_type !== "deneme").reduce((n, p) => n + p.end - p.start, 0)
  const comp: WeekComposition = {
    konu: 0,
    soru: 0,
    tekrar: 0,
    analiz: 0,
    video: 0,
  }
  for (const p of placed) {
    if (p.req.block_type === "deneme") continue
    const m = p.end - p.start
    if (p.req.kind === "konu") comp.konu += m
    else if (p.req.kind === "video") comp.video += m
    else if ((p.req.kind === "soru" || p.req.kind === "iskelet") && p.req.block_type !== "tekrar") comp.soru += m
    else if (p.req.kind === "analiz") comp.analiz += m
    else comp.tekrar += m
  }
  const st = study()
  if (st > 0) {
    if (ratioOf(comp.konu + comp.video, st) > rules.ratios.konuMax + 1e-9) warnings.push("konu oranı yüksek")
    if (ratioOf(comp.soru, st) < rules.ratios.soruMin - 1e-9 && soruTarget() > 0) warnings.push("soru oranı düşük")
    if (ratioOf(comp.tekrar + comp.analiz, st) < rules.ratios.tekrarMin - 1e-9) warnings.push("tekrar oranı düşük")
  }

  const items: DraftItem[] = placed
    .sort((a, b) => a.day - b.day || a.start - b.start)
    .map((p) => ({
      day_of_week: p.day,
      start_time: toHHMM(p.start),
      end_time: toHHMM(p.end),
      subject_id: p.req.subject_id,
      topic_id: p.req.topic_id,
      assignment_id: p.req.assignment_id,
      block_type: p.req.block_type,
      baslik: p.req.baslik,
      hedef_soru: p.req.hedef_soru,
      neden: p.req.neden,
    }))
  const subjectMinutes: Record<string, number> = {}
  for (const p of placed)
    if (p.req.subject_id && p.req.block_type !== "deneme")
      subjectMinutes[p.req.subject_id] = (subjectMinutes[p.req.subject_id] ?? 0) + p.end - p.start
  const blocks = items.filter((i) => i.block_type !== "deneme")
  return {
    items,
    meta: {
      examCount: placedExams + (input.existingExams ?? 0),
      blockCount: blocks.length,
      capacityBlocks: Math.floor(budgetTotal / Math.max(focus, 1)),
      unplaced: noLecture.size,
      studyMinutes: st,
      lectures,
      videoMinutes,
      videoOverflowMinutes: videoOverflow,
      composition: comp,
      subjectMinutes,
      warnings,
    },
  }
}

/**
 * Video günleri: aynı dersin bir günlük video süresi video_min_chunk_minutes'tan
 * kısaysa sonraki video gününe (yoksa ertesi güne) birleştirilir; ders başına
 * günde tek video bloğu.
 */
export function mergeVideoDays(days: VideoDay[], firstDay: number): VideoDay[] {
  const bySubject = new Map<string, VideoDay[]>()
  for (const d of [...days].filter((x) => x.day_of_week >= firstDay).sort((a, b) => a.day_of_week - b.day_of_week)) {
    const list = bySubject.get(d.subject_id) ?? []
    const same = list.find((x) => x.day_of_week === d.day_of_week)
    if (same) {
      same.minutes += d.minutes
      same.topic_ids = Array.from(new Set([...same.topic_ids, ...d.topic_ids]))
      same.label = `${same.label} + ${d.label}`
    } else list.push({ ...d, topic_ids: [...d.topic_ids] })
    bySubject.set(d.subject_id, list)
  }
  const out: VideoDay[] = []
  for (const list of bySubject.values()) {
    let carry: VideoDay | null = null
    for (let i = 0; i < list.length; i++) {
      const cur: VideoDay = carry
        ? {
            ...list[i],
            minutes: list[i].minutes + carry.minutes,
            topic_ids: Array.from(new Set([...carry.topic_ids, ...list[i].topic_ids])),
            label: list[i].label,
          }
        : list[i]
      carry = null
      const isLast = i === list.length - 1
      if (cur.minutes < C.video_min_chunk_minutes && !isLast) {
        carry = cur
        continue
      }
      if (cur.minutes < C.video_min_chunk_minutes && isLast && cur.day_of_week < 7) {
        out.push({
          ...cur,
          day_of_week: cur.day_of_week + 1,
          minutes: Math.max(cur.minutes, C.video_min_chunk_minutes),
        })
        continue
      }
      out.push({
        ...cur,
        minutes: Math.max(cur.minutes, C.video_min_chunk_minutes),
      })
    }
  }
  return out.sort((a, b) => a.day_of_week - b.day_of_week)
}

/** Aralıklı tekrar vadeleri: tamamlanma tarihinden +offset gün; bu haftaya düşenler. */
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
