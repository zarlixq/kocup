import { addMonths, isBefore, setDate, startOfMonth, subMonths } from "date-fns"
import { isoDate } from "@/lib/format"

export type PaymentStatus = "paid" | "partial" | "pending"

export function getPaymentStatus(
  paymentsForMonth: { amount: number | string }[],
  monthlyPrice: number | string
): PaymentStatus {
  const total = paymentsForMonth.reduce((s, p) => s + Number(p.amount), 0)
  const price = Number(monthlyPrice)
  if (total <= 0) return "pending"
  if (total + 0.001 >= price) return "paid"
  return "partial"
}

export function nextPaymentDate(paymentDay: number, today = new Date()) {
  const safeDay = Math.min(Math.max(paymentDay, 1), 28)
  const thisMonth = setDate(startOfMonth(today), safeDay)
  return isBefore(thisMonth, today) ? addMonths(thisMonth, 1) : thisMonth
}

export function currentPeriodMonth(date = new Date()) {
  return startOfMonth(date)
}

export function currentPeriodMonthISO(date = new Date()) {
  return isoDate(startOfMonth(date))
}

export function monthOptions(pastCount = 12, futureCount = 3, anchor = new Date()) {
  const start = startOfMonth(anchor)
  const list: Date[] = []
  for (let i = pastCount; i > 0; i--) list.push(subMonths(start, i))
  list.push(start)
  for (let i = 1; i <= futureCount; i++) list.push(addMonths(start, i))
  return list
}

export function statusLabel(status: PaymentStatus): string {
  switch (status) {
    case "paid":
      return "Ödendi"
    case "partial":
      return "Kısmi"
    case "pending":
    default:
      return "Bekliyor"
  }
}
