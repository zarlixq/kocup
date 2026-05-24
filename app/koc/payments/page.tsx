import Link from "next/link"
import { Wallet } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatTRY, formatDate, formatMonth } from "@/lib/format"
import { currentPeriodMonthISO } from "@/lib/payments"
import { PaymentsFilters } from "@/components/koc/payments-filters"
import { DeletePaymentButton } from "@/components/koc/delete-payment-button"

export const metadata = { title: "Ödemeler — KoçUp" }

type SearchParams = { ay?: string; ogrenci?: string; yontem?: string }

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const month = sp.ay ?? currentPeriodMonthISO()
  const studentId = sp.ogrenci ?? ""
  const method = sp.yontem ?? ""

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Koçun öğrencilerini al
  const { data: coachStudents } = await supabase
    .from("students")
    .select("id")
    .eq("coach_id", user!.id)

  const coachStudentIds = (coachStudents ?? []).map((s) => s.id)

  if (coachStudentIds.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-zinc-900">Ödemeler</h1>
        <EmptyState text="Henüz öğrencin yok." />
      </div>
    )
  }

  let query = supabase
    .from("payments")
    .select("id, amount, payment_date, period_month, method, notes, student_id, packages(name)")
    .in("student_id", coachStudentIds)
    .order("payment_date", { ascending: false })

  if (month && month !== "tum") query = query.eq("period_month", month)
  if (studentId) query = query.eq("student_id", studentId)
  if (method) query = query.eq("method", method)

  const [{ data: payments }, { data: profiles }] = await Promise.all([
    query,
    supabase.from("profiles").select("id, full_name").in("id", coachStudentIds).order("full_name"),
  ])

  const nameById: Record<string, string> = {}
  for (const p of profiles ?? []) nameById[p.id] = p.full_name

  const total = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Ödemeler</h1>
          <p className="text-sm text-zinc-500 mt-1">Tüm ödemelerini görüntüle ve filtrele.</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3">
          <div className="text-xs text-zinc-500">Filtrelenmiş Toplam</div>
          <div className="text-xl font-bold text-zinc-900 tabular-nums">{formatTRY(total)}</div>
        </div>
      </div>

      <PaymentsFilters
        defaultMonth={month}
        defaultStudent={studentId}
        defaultMethod={method}
        students={(profiles ?? []).map((p) => ({ id: p.id, full_name: p.full_name }))}
      />

      {!payments || payments.length === 0 ? (
        <EmptyState text="Bu filtreyle ödeme bulunamadı. Farklı bir ay veya öğrenci seçmeyi dene." />
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Öğrenci</TableHead>
                <TableHead>Paket</TableHead>
                <TableHead>Dönem</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead>Yöntem</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(p.payment_date)}</TableCell>
                  <TableCell>
                    <Link href={`/koc/ogrenciler/${p.student_id}`} className="font-medium text-zinc-900 hover:text-[#1B6B8A]">
                      {nameById[p.student_id] ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-zinc-600">{p.packages?.name ?? "-"}</TableCell>
                  <TableCell className="capitalize text-zinc-600">{formatMonth(p.period_month)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatTRY(p.amount)}</TableCell>
                  <TableCell className="capitalize text-zinc-600">{p.method ?? "-"}</TableCell>
                  <TableCell>
                    <DeletePaymentButton paymentId={p.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
      <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
        <Wallet className="h-6 w-6 text-zinc-500" />
      </div>
      <p className="text-sm text-zinc-500">{text}</p>
    </div>
  )
}
