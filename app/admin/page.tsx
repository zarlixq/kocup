import Link from "next/link"
import { Users, TrendingUp, Wallet, AlertCircle, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { StatCard } from "@/blocks/admin/stat-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatTRY, formatDate, formatMonth } from "@/lib/format"
import { currentPeriodMonthISO, getPaymentStatus, statusLabel } from "@/lib/payments"
import { PaymentFormDialog } from "@/blocks/admin/payment-form-dialog"

export const metadata = { title: "Dashboard — KoçUp" }

export default async function DashboardPage() {
  const supabase = await createClient()
  const periodIso = currentPeriodMonthISO()

  const [{ data: students }, { data: paymentsThisMonth }, { data: recentPayments }] = await Promise.all([
    supabase
      .from("students")
      .select(
        "id, full_name, is_active, packages(id, name, monthly_price, payment_day, status), payments(amount, period_month)"
      ),
    supabase.from("payments").select("amount").eq("period_month", periodIso),
    supabase
      .from("payments")
      .select("id, amount, payment_date, method, student_id, students(full_name)")
      .order("payment_date", { ascending: false })
      .limit(10),
  ])

  const activeStudents = (students ?? []).filter((s) => s.is_active)
  const expected = activeStudents.reduce((sum, s) => {
    const active = s.packages?.find((p) => p.status === "active")
    return sum + (active ? Number(active.monthly_price) : 0)
  }, 0)
  const collected = (paymentsThisMonth ?? []).reduce((s, p) => s + Number(p.amount), 0)

  const rows = activeStudents.map((s) => {
    const active = s.packages?.find((p) => p.status === "active")
    const paid = (s.payments ?? [])
      .filter((p) => p.period_month === periodIso)
      .reduce((sum, p) => sum + Number(p.amount), 0)
    const status = active ? getPaymentStatus([{ amount: paid }], active.monthly_price) : ("pending" as const)
    return { student: s, active, paid, status }
  })
  const pendingCount = rows.filter((r) => r.active && r.status === "pending").length

  rows.sort((a, b) => {
    const order = { pending: 0, partial: 1, paid: 2 } as const
    return order[a.status] - order[b.status]
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1 capitalize">{formatMonth(new Date())}</p>
        </div>
        <Link href="/admin/ogrenciler/yeni">
          <Button variant="accent">
            <Plus className="h-4 w-4" /> Yeni Öğrenci
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Aktif Öğrenci"
          value={String(activeStudents.length)}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Bu Ay Beklenen"
          value={formatTRY(expected)}
          icon={<TrendingUp className="h-4 w-4" />}
          accent="orange"
        />
        <StatCard
          label="Bu Ay Tahsil Edilen"
          value={formatTRY(collected)}
          hint={`${expected > 0 ? Math.round((collected / expected) * 100) : 0}% tahsilat`}
          icon={<Wallet className="h-4 w-4" />}
          accent="green"
        />
        <StatCard
          label="Bekleyen Ödeme"
          value={String(pendingCount)}
          icon={<AlertCircle className="h-4 w-4" />}
          accent={pendingCount > 0 ? "red" : "default"}
        />
      </div>

      <div>
        <h2 className="text-base font-semibold text-zinc-900 mb-3 capitalize">Bu Ay — {formatMonth(new Date())}</h2>
        {rows.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-zinc-500" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 mb-1">Henüz aktif öğrencin yok</h3>
            <p className="text-sm text-zinc-500 mb-5">İlk öğrencini eklemek için aşağıdaki butona tıkla.</p>
            <Link href="/admin/ogrenciler/yeni">
              <Button variant="accent">
                <Plus className="h-4 w-4" /> Yeni Öğrenci
              </Button>
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Öğrenci</TableHead>
                  <TableHead>Paket</TableHead>
                  <TableHead className="text-right">Aylık</TableHead>
                  <TableHead className="text-right">Ödenen</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Ödeme Günü</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.student.id}>
                    <TableCell>
                      <Link href={`/admin/ogrenciler/${r.student.id}`} className="font-medium hover:text-[#1B6B8A]">
                        {r.student.full_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-zinc-600">{r.active?.name ?? <span className="text-zinc-400">—</span>}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.active ? formatTRY(r.active.monthly_price) : "-"}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{formatTRY(r.paid)}</TableCell>
                    <TableCell>
                      {r.active ? (
                        <Badge variant={r.status === "paid" ? "paid" : r.status === "partial" ? "partial" : "pending"}>
                          {statusLabel(r.status)}
                        </Badge>
                      ) : (
                        <span className="text-zinc-400 text-xs">Paket yok</span>
                      )}
                    </TableCell>
                    <TableCell className="text-zinc-600">{r.active?.payment_day ? `Ayın ${r.active.payment_day}'i` : "-"}</TableCell>
                    <TableCell>
                      {r.active && r.status !== "paid" && (
                        <PaymentFormDialog
                          studentId={r.student.id}
                          packages={[{ id: r.active.id, name: r.active.name, monthly_price: r.active.monthly_price }]}
                          defaultPackageId={r.active.id}
                          trigger={
                            <Button variant="outline" size="sm">
                              Ödeme Ekle
                            </Button>
                          }
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-zinc-900">Son Ödemeler</h2>
          <Link href="/admin/odemeler" className="text-sm text-[#1B6B8A] hover:underline">
            Tümünü Gör →
          </Link>
        </div>
        {!recentPayments || recentPayments.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-8 text-center text-sm text-zinc-500">
            Henüz ödeme kaydı yok.
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Öğrenci</TableHead>
                  <TableHead className="text-right">Tutar</TableHead>
                  <TableHead>Yöntem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPayments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(p.payment_date)}</TableCell>
                    <TableCell>
                      <Link href={`/admin/ogrenciler/${p.student_id}`} className="font-medium hover:text-[#1B6B8A]">
                        {p.students?.full_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatTRY(p.amount)}</TableCell>
                    <TableCell className="capitalize text-zinc-600">{p.method ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
