import type { Database } from "@/lib/database.types"

export type AssignmentStatus = Database["public"]["Enums"]["assignment_status"]

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

/**
 * UI'da gösterilecek durum:
 * - status='aktif' AND son_tarih < today AND cozulen < hedef  → 'gecikti'
 * - status='aktif' AND cozulen >= hedef                       → 'tamamlandi'  (UI level, DB'de 'aktif' kalabilir)
 * - aksi: DB status'u
 */
export function deriveAssignmentStatus(
  status: AssignmentStatus,
  cozulenSoru: number,
  hedefSoru: number,
  sonTarih: string,
  today = new Date(),
): DerivedAssignmentStatus {
  if (status !== "aktif") return status
  if (cozulenSoru >= hedefSoru) return "tamamlandi"
  const son = new Date(sonTarih)
  son.setHours(23, 59, 59, 999)
  if (son < today) return "gecikti"
  return "aktif"
}

export function progressPercent(cozulen: number, hedef: number): number {
  if (hedef <= 0) return 0
  return Math.min(100, Math.round((cozulen / hedef) * 100))
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
