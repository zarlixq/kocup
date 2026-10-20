import { PRACTICE_GROUPS, REVIEW_QUESTIONS } from "@/lib/upplan/config"
import { masteryLabel, type MasteryLabel } from "@/lib/upplan/mastery"

// Hedef aşaması ve "Şimdi ne yapmalısın?" satırı — saf (Konularım kartı, test).
//   ogren : öğrenme aşaması zorunlu (hiç görmedim / zayıf) ve henüz öğrenilmedi
//   soru  : soru çözümü (opsiyonel kısa tekrar önerilebilir)
//   tekrar: konu iyi; tekrar soruları
//   pratik: sürekli pratik konusu (paragraf, problemler): sınava kadar haftalık blok

export type GoalStage = "ogren" | "soru" | "tekrar" | "pratik"
export const STAGE_ORDER: Record<GoalStage, number> = { ogren: 0, soru: 1, tekrar: 2, pratik: 3 }
export const STAGE_LABEL: Record<GoalStage, string> = { ogren: "Öğrenme", soru: "Soru", tekrar: "Tekrar", pratik: "Sürekli pratik" }

export type StageInput = {
  learning_phase: string | null
  learned_at: string | null
  block_type: string | null
  is_practice?: boolean
}

export function goalStage(g: StageInput): GoalStage {
  if (g.learning_phase === "gerekli" && !g.learned_at) return "ogren"
  if (g.is_practice) return "pratik"
  if (g.block_type === "tekrar") return "tekrar"
  return "soru"
}

export type GoalCoaching = {
  stage: GoalStage
  nextAction: string
  /** "Konuyu öğrendim" butonu (öğrenme aşamasında ya da opsiyonel tekrar bekliyorsa). */
  canMarkLearned: boolean
  mastery: { effective: number; label: MasteryLabel } | null
  /** Kısa gerekçe (yol haritasından): "Saat başına yaklaşık X puan: …". */
  why: string | null
}

export function goalCoaching(
  g: StageInput & { topic_name: string; subject_name?: string; cozulen_soru: number; hedef_soru: number | null },
  opts: { effective: number | null; video: { teacher: string; count: number } | null; why?: string | null },
): GoalCoaching {
  const stage = goalStage(g)
  const target = g.hedef_soru
  let nextAction: string
  if (stage === "ogren") {
    nextAction = opts.video
      ? `Önce konuyu öğren: ${opts.video.teacher} – ${g.topic_name} ${opts.video.count > 1 ? `videoları (${opts.video.count})` : "videosu"}`
      : "Önce konuyu öğren: konu anlatımını çalış, bitince \"Konuyu öğrendim\" de"
  } else if (stage === "pratik") {
    const grp = PRACTICE_GROUPS.find((x) => x.subject === g.subject_name && x.topics.includes(g.topic_name))
    nextAction = grp
      ? `Sürekli pratik: her hafta ${grp.blocksPerWeek} × ${grp.questionsPerBlock} soru (${grp.label}), sınava kadar`
      : "Sürekli pratik: her hafta küçük soru blokları, sınava kadar"
  } else if (stage === "tekrar") {
    const left = target !== null ? Math.max(target - g.cozulen_soru, 0) : REVIEW_QUESTIONS
    nextAction = `Tekrar: ${left || REVIEW_QUESTIONS} soru`
  } else {
    const progress = target !== null ? `${g.cozulen_soru}/${target}` : `${g.cozulen_soru} soru`
    nextAction =
      g.learning_phase === "opsiyonel" && !g.learned_at ? `İstersen kısa tekrar yap, sonra soru çöz: ${progress}` : `Soru çöz: ${progress}`
  }
  return {
    stage,
    nextAction,
    canMarkLearned: (g.learning_phase === "gerekli" || g.learning_phase === "opsiyonel") && !g.learned_at,
    mastery: opts.effective === null ? null : { effective: Math.round(opts.effective), label: masteryLabel(opts.effective) },
    why: opts.why ?? null,
  }
}
