import type { Database } from "@/lib/database.types"

export type DbAssignmentStatus = Database["public"]["Enums"]["assignment_status"]

// UpPlan yol haritası kuyruğu (migration 211): henüz açılmamış hedefler. Hedef
// ekranlarında görünmez; yalnız Konularım yol haritası gösterir.
export const QUEUED_STATUSES = ["sirada", "zaman_kalirsa"] as const satisfies readonly DbAssignmentStatus[]

export type AssignmentStatus = Exclude<DbAssignmentStatus, (typeof QUEUED_STATUSES)[number]>

// Read-time hesaplanan UI durumu: DB'de 'gecikti' yok, son_tarih < today + cozulen < hedef ile UI'da hesapla.
export type DerivedAssignmentStatus = AssignmentStatus | "gecikti"

export const ASSIGNMENT_STATUS_LABEL: Record<DerivedAssignmentStatus, string> = {
  aktif: "Aktif",
  tamamlandi: "Tamamlandı",
  iptal: "İptal",
  gecikti: "Gecikti",
}

export const ASSIGNMENT_STATUS_VARIANT: Record<
  DerivedAssignmentStatus,
  "pending" | "paid" | "inactive" | "partial"
> = {
  aktif: "pending",
  tamamlandi: "paid",
  iptal: "inactive",
  gecikti: "inactive",
}

export const ASSIGNMENT_STATUS_TONE: Record<
  DerivedAssignmentStatus,
  { bg: string; text: string; border: string }
> = {
  aktif: { bg: "bg-cyan-50", text: "text-cyan-800", border: "border-cyan-200" },
  tamamlandi: { bg: "bg-green-50", text: "text-green-800", border: "border-green-200" },
  iptal: { bg: "bg-zinc-50", text: "text-zinc-500", border: "border-zinc-200" },
  gecikti: { bg: "bg-red-50", text: "text-red-800", border: "border-red-200" },
}

// Doğruluk hedefi için anlamlı örneklem: 3 sorudan 3 doğru "%100" sayılmasın.
export const MIN_ACCURACY_SAMPLE = 20

export type GoalTargets = {
  /** Hedef soru sayısı; yalnızca doğruluk hedefi varsa null. */
  hedefSoru: number | null
  /** Hedef doğruluk % (1–100); yoksa null/undefined. */
  hedefDogruluk?: number | null
  /** Doğru sayısı — doğruluk hedefi için gerekli. */
  dogru?: number
}

export function accuracyOf(dogru: number, cozulen: number): number | null {
  return cozulen > 0 ? Math.round((dogru / cozulen) * 100) : null
}

/** Hedef(ler) tuttu mu? Soru ve doğruluk hedefi birlikte varsa ikisi de gerekir. */
export function isGoalMet(cozulen: number, t: GoalTargets): boolean {
  const soruOk = t.hedefSoru == null || cozulen >= t.hedefSoru
  if (t.hedefDogruluk == null) return t.hedefSoru != null && soruOk
  const acc = accuracyOf(t.dogru ?? 0, cozulen)
  const accOk = cozulen >= MIN_ACCURACY_SAMPLE && acc != null && acc >= t.hedefDogruluk
  return soruOk && accOk
}

/**
 * UI'da gösterilecek durum:
 * - status='aktif' AND hedef tuttu                  → 'tamamlandi' (UI level, DB'de 'aktif' kalabilir)
 * - status='aktif' AND son_tarih < today            → 'gecikti'
 * - aksi: DB status'u
 * `hedef` sayı verilirse eski çağrı biçimi (yalnız soru hedefi) korunur.
 */
export function deriveAssignmentStatus(
  status: AssignmentStatus,
  cozulenSoru: number,
  hedef: number | null | GoalTargets,
  sonTarih: string,
  today = new Date(),
): DerivedAssignmentStatus {
  if (status !== "aktif") return status
  const targets: GoalTargets = typeof hedef === "object" && hedef !== null ? hedef : { hedefSoru: hedef }
  if (isGoalMet(cozulenSoru, targets)) return "tamamlandi"
  const son = new Date(sonTarih)
  son.setHours(23, 59, 59, 999)
  if (son < today) return "gecikti"
  return "aktif"
}

/**
 * 0–100 ilerleme. İki hedef varsa ortalaması; doğruluk bileşeni örneklem
 * dolana kadar örneklem oranıyla sınırlanır.
 */
export function progressPercent(cozulen: number, hedef: number | null | GoalTargets): number {
  const t: GoalTargets = typeof hedef === "object" && hedef !== null ? hedef : { hedefSoru: hedef }
  const parts: number[] = []
  if (t.hedefSoru != null && t.hedefSoru > 0) parts.push(Math.min(1, cozulen / t.hedefSoru))
  if (t.hedefDogruluk != null && t.hedefDogruluk > 0) {
    const acc = accuracyOf(t.dogru ?? 0, cozulen) ?? 0
    const sample = Math.min(1, cozulen / MIN_ACCURACY_SAMPLE)
    parts.push(Math.min(1, acc / t.hedefDogruluk, sample))
  }
  if (parts.length === 0) return 0
  return Math.round((parts.reduce((s, p) => s + p, 0) / parts.length) * 100)
}

/** "32 / 50 soru", "32 soru · %78 (hedef %80)" gibi kısa hedef özeti. */
export function goalSummary(cozulen: number, t: GoalTargets): string {
  const soru = t.hedefSoru != null ? `${cozulen} / ${t.hedefSoru} soru` : `${cozulen} soru`
  if (t.hedefDogruluk == null) return soru
  const acc = accuracyOf(t.dogru ?? 0, cozulen)
  return `${soru} · ${acc == null ? "—" : `%${acc}`} (hedef %${t.hedefDogruluk})`
}

/**
 * İlerleme barı için renk:
 * - tamamlandi → green
 * - gecikti    → red
 * - %75+       → orange
 * - aksi       → navy
 */
export function progressBarColor(
  derived: DerivedAssignmentStatus,
  percent: number,
): string {
  if (derived === "tamamlandi") return "bg-green-500"
  if (derived === "gecikti") return "bg-red-500"
  if (percent >= 75) return "bg-[#F97316]"
  return "bg-[#1B6B8A]"
}

export const EXAM_TYPE_LABEL: Record<string, string> = {
  tyt: "TYT",
  ayt: "AYT",
  tyt_ayt: "TYT + AYT",
  lgs: "LGS",
  okul: "Okul",
}
