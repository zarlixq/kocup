import type { Database } from "@/lib/database.types"

export type AppointmentType = Database["public"]["Enums"]["appointment_type"]
export type AppointmentStatus = Database["public"]["Enums"]["appointment_status"]

export const APPOINTMENT_TYPE_LABEL: Record<AppointmentType, string> = {
  tanitim: "Tanıtım",
  koc_gorusme: "Koç Görüşme",
  veli_gorusme: "Veli Görüşme",
  ozel: "Özel",
}

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  planlandi: "Planlandı",
  tamamlandi: "Tamamlandı",
  iptal: "İptal",
  gelmedi: "Gelmedi",
}

// Tip bazlı renkler — takvim block'u ve badge için
export const APPOINTMENT_TYPE_COLOR: Record<
  AppointmentType,
  { bg: string; border: string; text: string; dot: string }
> = {
  tanitim: {
    bg: "bg-orange-50",
    border: "border-orange-300",
    text: "text-orange-800",
    dot: "bg-[#F97316]",
  },
  koc_gorusme: {
    bg: "bg-cyan-50",
    border: "border-cyan-300",
    text: "text-cyan-900",
    dot: "bg-[#1B6B8A]",
  },
  veli_gorusme: {
    bg: "bg-purple-50",
    border: "border-purple-300",
    text: "text-purple-800",
    dot: "bg-[#A855F7]",
  },
  ozel: {
    bg: "bg-zinc-100",
    border: "border-zinc-300",
    text: "text-zinc-800",
    dot: "bg-zinc-500",
  },
}

export const APPOINTMENT_STATUS_VARIANT: Record<
  AppointmentStatus,
  "paid" | "pending" | "inactive" | "partial"
> = {
  planlandi: "pending",
  tamamlandi: "paid",
  iptal: "inactive",
  gelmedi: "inactive",
}

export const RECURRENCE_LABEL: Record<string, string> = {
  weekly: "Her hafta",
  biweekly: "İki haftada bir",
}
