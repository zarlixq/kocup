import { addDays } from "@/lib/analytics/analiz/filter"

// Analizim — otomatik içgörüler (KURAL TABANLI, AI yok). Saf fonksiyon:
// girdi analiz verileri, çıktı kısa kartlar. Eşikler INSIGHT_RULES'ta; burada
// değiştirmek yeterli. Tipler yapısal (load.ts'e bağımlı değil → test edilir).

export const INSIGHT_RULES = {
  /** Son 7 gün vs önceki 7 gün soru sayısı. */
  weekChange: { minBase: 20, minChangePct: 25 },
  /** Zayıf konu + izlenmemiş video. */
  weakTopic: { minQuestions: 20, maxAccuracy: 50 },
  /** Ders bazında çalışılmayan gün. */
  staleSubject: { minDays: 10 },
  /** Denemede art arda yükseliş/düşüş. */
  examTrend: { exams: 3, minDelta: 0.5 },
  /** Art arda çalışılan gün. */
  streak: { minDays: 3 },
  /** Zayıf derse ayrılan zaman payı. */
  timeShare: { minQuestions: 30, maxSharePct: 10, minTotalMinutes: 120 },
  /** Tekrar edilmemiş yanlış. */
  unrepeated: { min: 5 },
  maxCards: 5,
} as const

export type InsightTarget = "soru-cozum" | "kaynaklar" | "denemeler" | "program" | "yanlis-defteri" | "konular"

export type Insight = {
  id: string
  tone: "positive" | "warning" | "info"
  text: string
  cta: string
  target: InsightTarget
  /** Büyük = önce gösterilir. */
  weight: number
}

export type InsightInput = {
  today: string
  daily: { day: string; questions: number }[]
  subjects: { subject_name: string; questions: number; correct: number; minutes: number; last_date: string | null }[]
  topics: { topic_name: string; questions: number; correct: number; videos_total: number; videos_watched: number }[]
  exams: { date: string; exam_type: string; subjects: { name: string; net: number }[] }[]
  streak: number
  unrepeatedWrongs: number
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000)
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0)

export function buildInsights(input: InsightInput): Insight[] {
  const R = INSIGHT_RULES
  const out: Insight[] = []

  // 1) Son 7 gün vs önceki 7 gün.
  const last7From = addDays(input.today, -6)
  const prev7From = addDays(input.today, -13)
  let cur = 0
  let prev = 0
  for (const d of input.daily) {
    if (d.day >= last7From && d.day <= input.today) cur += d.questions
    else if (d.day >= prev7From && d.day < last7From) prev += d.questions
  }
  if (prev >= R.weekChange.minBase) {
    const change = Math.round(((cur - prev) / prev) * 100)
    if (Math.abs(change) >= R.weekChange.minChangePct) {
      out.push(
        change < 0
          ? {
              id: "week-down",
              tone: "warning",
              text: `Son 7 günde önceki haftaya göre %${Math.abs(change)} daha az soru çözdün (${cur} / ${prev}).`,
              cta: "Soru kaydı ekle",
              target: "soru-cozum",
              weight: 70,
            }
          : {
              id: "week-up",
              tone: "positive",
              text: `Son 7 günde önceki haftaya göre %${change} daha fazla soru çözdün (${cur} / ${prev}). Harika gidiyorsun!`,
              cta: "Devam et",
              target: "soru-cozum",
              weight: 45,
            },
      )
    }
  }

  // 2) Zayıf konu, videosu izlenmemiş.
  const weak = input.topics
    .filter((t) => t.questions >= R.weakTopic.minQuestions && pct(t.correct, t.questions) < R.weakTopic.maxAccuracy)
    .sort((a, b) => a.correct / a.questions - b.correct / b.questions)[0]
  if (weak) {
    const noVideo = weak.videos_watched === 0
    out.push({
      id: "weak-topic",
      tone: "warning",
      text: `${weak.topic_name} konusunda çözdüğün ${weak.questions} soruda başarın %${pct(weak.correct, weak.questions)}${
        noVideo ? (weak.videos_total > 0 ? "; konu anlatımı videosu izlenmemiş." : "; konu anlatımı videosu eklenmemiş.") : "."
      }`,
      cta: noVideo ? "Videoya git" : "Konularım",
      target: noVideo ? "kaynaklar" : "konular",
      weight: 80,
    })
  }

  // 3) Uzun süredir çalışılmayan ders.
  const stale = input.subjects
    .filter((s) => s.last_date)
    .map((s) => ({ s, days: daysBetween(s.last_date!, input.today) }))
    .filter((x) => x.days >= R.staleSubject.minDays)
    .sort((a, b) => b.days - a.days)[0]
  if (stale) {
    out.push({
      id: "stale-subject",
      tone: "warning",
      text: `${stale.s.subject_name} dersine ${stale.days} gündür hiç çalışmadın.`,
      cta: "Programına ekle",
      target: "program",
      weight: 65,
    })
  }

  // 4) Denemede art arda yükseliş / düşüş (aynı sınav türü, ders bazında).
  const byType = new Map<string, InsightInput["exams"]>()
  for (const e of input.exams) byType.set(e.exam_type, [...(byType.get(e.exam_type) ?? []), e])
  let trendDone = false
  for (const [, list] of byType) {
    if (trendDone || list.length < R.examTrend.exams) continue
    const last = list.slice(-R.examTrend.exams)
    const names = new Set(last.flatMap((e) => e.subjects.map((s) => s.name)))
    let best: { name: string; delta: number } | null = null
    for (const name of names) {
      const nets = last.map((e) => e.subjects.find((s) => s.name === name)?.net)
      if (nets.some((n) => n === undefined)) continue
      const ns = nets as number[]
      const up = ns.every((n, i) => i === 0 || n - ns[i - 1] >= R.examTrend.minDelta)
      const down = ns.every((n, i) => i === 0 || ns[i - 1] - n >= R.examTrend.minDelta)
      if (!up && !down) continue
      const delta = ns[ns.length - 1] - ns[0]
      if (!best || Math.abs(delta) > Math.abs(best.delta)) best = { name, delta }
    }
    if (best) {
      trendDone = true
      out.push(
        best.delta > 0
          ? {
              id: "exam-up",
              tone: "positive",
              text: `Son ${R.examTrend.exams} denemede ${best.name} netin sürekli yükseliyor (+${best.delta.toFixed(2)}).`,
              cta: "Denemelerim",
              target: "denemeler",
              weight: 55,
            }
          : {
              id: "exam-down",
              tone: "warning",
              text: `Son ${R.examTrend.exams} denemede ${best.name} netin sürekli düşüyor (${best.delta.toFixed(2)}).`,
              cta: "Denemelerim",
              target: "denemeler",
              weight: 75,
            },
      )
    }
  }

  // 5) Seri.
  if (input.streak >= R.streak.minDays) {
    out.push({
      id: "streak",
      tone: "positive",
      text: `${input.streak} gündür aralıksız çalışıyorsun, seriyi bozma!`,
      cta: "Bugünü kaydet",
      target: "soru-cozum",
      weight: 40,
    })
  }

  // 6) Zaman payı ↔ zayıflık dengesizliği.
  const totalMin = input.subjects.reduce((s, x) => s + x.minutes, 0)
  if (totalMin >= R.timeShare.minTotalMinutes) {
    const lowest = input.subjects
      .filter((s) => s.questions >= R.timeShare.minQuestions)
      .sort((a, b) => a.correct / a.questions - b.correct / b.questions)[0]
    if (lowest) {
      const share = pct(lowest.minutes, totalMin)
      if (share < R.timeShare.maxSharePct) {
        out.push({
          id: "time-share",
          tone: "info",
          text: `${lowest.subject_name} en düşük başarılı dersin (%${pct(lowest.correct, lowest.questions)}) ama çalışma zamanının yalnız %${share}'i.`,
          cta: "Programı düzenle",
          target: "program",
          weight: 60,
        })
      }
    }
  }

  // 7) Tekrar edilmemiş yanlışlar.
  if (input.unrepeatedWrongs >= R.unrepeated.min) {
    out.push({
      id: "unrepeated",
      tone: "info",
      text: `Yanlış defterinde, sonrasında konusu tekrar çalışılmamış ${input.unrepeatedWrongs} kayıt var.`,
      cta: "Yanlış defteri",
      target: "yanlis-defteri",
      weight: 50,
    })
  }

  return out.sort((a, b) => b.weight - a.weight).slice(0, R.maxCards)
}
