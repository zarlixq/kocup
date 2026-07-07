// Haftalık gün eşlemesi — day_of_week 1 (Pazartesi) .. 7 (Pazar).
export const DAYS = [
  { num: 1, short: "Pzt", label: "Pazartesi" },
  { num: 2, short: "Sal", label: "Salı" },
  { num: 3, short: "Çar", label: "Çarşamba" },
  { num: 4, short: "Per", label: "Perşembe" },
  { num: 5, short: "Cum", label: "Cuma" },
  { num: 6, short: "Cts", label: "Cumartesi" },
  { num: 7, short: "Paz", label: "Pazar" },
] as const

// JS Date.getDay() (Paz=0..Cts=6) → 1 (Pzt) .. 7 (Paz)
export function todayDayOfWeek(d: Date = new Date()): number {
  return ((d.getDay() + 6) % 7) + 1
}
