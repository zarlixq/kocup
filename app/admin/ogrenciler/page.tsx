import Link from "next/link"
import { Plus, Users } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { currentPeriodMonthISO, getPaymentStatus, statusLabel } from "@/lib/payments"
import { StudentSearch } from "@/blocks/admin/student-search"

export const metadata = { title: "Öğrenciler — KoçUp" }

type SearchParams = { q?: string; filtre?: string }

export default async function OgrencilerPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const q = (sp.q ?? "").trim()
  const filter = sp.filtre ?? "aktif"

  const supabase = await createClient()

  let query = supabase
    .from("students")
    .select(
      `id, full_name, school, grade, is_active,
       packages(id, monthly_price, status, name),
       payments(amount, period_month)`
    )
    .order("created_at", { ascending: false })

  if (filter === "aktif") query = query.eq("is_active", true)
  else if (filter === "pasif") query = query.eq("is_active", false)
  if (q) query = query.or(`full_name.ilike.%${q}%,school.ilike.%${q}%`)

  const { data: students } = await query
  const periodIso = currentPeriodMonthISO()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Öğrenciler</h1>
          <p className="text-sm text-zinc-500 mt-1">Tüm öğrencilerini buradan yönet.</p>
        </div>
        <Link href="/admin/ogrenciler/yeni">
          <Button variant="accent">
            <Plus className="h-4 w-4" />
            Yeni Öğrenci
          </Button>
        </Link>
      </div>

      <StudentSearch defaultQ={q} defaultFilter={filter} />

      {!students || students.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
            <Users className="h-6 w-6 text-zinc-500" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 mb-1">
            {q ? "Sonuç bulunamadı" : "Henüz öğrencin yok"}
          </h3>
          <p className="text-sm text-zinc-500 mb-5">
            {q ? "Arama kriterlerini değiştirmeyi dene." : "İlk öğrencini eklemek için aşağıdaki butona tıkla."}
          </p>
          {!q && (
            <Link href="/admin/ogrenciler/yeni">
              <Button variant="accent">
                <Plus className="h-4 w-4" />
                Yeni Öğrenci Ekle
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad Soyad</TableHead>
                <TableHead>Sınıf</TableHead>
                <TableHead>Okul</TableHead>
                <TableHead>Aktif Paket</TableHead>
                <TableHead>Bu Ay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => {
                const active = s.packages?.find((p) => p.status === "active")
                const paymentsThisMonth = (s.payments ?? []).filter((p) => p.period_month === periodIso)
                const status = active
                  ? getPaymentStatus(paymentsThisMonth, active.monthly_price)
                  : "pending"
                return (
                  <TableRow key={s.id} className="cursor-pointer">
                    <TableCell>
                      <Link href={`/admin/ogrenciler/${s.id}`} className="font-medium text-zinc-900 hover:text-[#1B6B8A] block">
                        {s.full_name}
                      </Link>
                    </TableCell>
                    <TableCell>{s.grade ?? "-"}</TableCell>
                    <TableCell>{s.school ?? "-"}</TableCell>
                    <TableCell>{active?.name ?? <span className="text-zinc-400">—</span>}</TableCell>
                    <TableCell>
                      {!s.is_active ? (
                        <Badge variant="inactive">Pasif</Badge>
                      ) : active ? (
                        <Badge variant={status === "paid" ? "paid" : status === "partial" ? "partial" : "pending"}>
                          {statusLabel(status)}
                        </Badge>
                      ) : (
                        <span className="text-zinc-400 text-xs">Paket yok</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
