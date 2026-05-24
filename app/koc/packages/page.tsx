import Link from "next/link"
import { Package } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatTRY, formatDate } from "@/lib/format"

export const metadata = { title: "Paketler — KoçUp" }

export default async function PackagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Önce koçun öğrencilerini al
  const { data: students } = await supabase
    .from("students")
    .select("id")
    .eq("coach_id", user!.id)

  const studentIds = (students ?? []).map((s) => s.id)
  if (studentIds.length === 0) {
    return <EmptyPage />
  }

  const [{ data: packages }, { data: profiles }] = await Promise.all([
    supabase
      .from("packages")
      .select("id, name, monthly_price, status, start_date, end_date, payment_day, student_id")
      .in("student_id", studentIds)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name").in("id", studentIds),
  ])

  const nameById: Record<string, string> = {}
  for (const p of profiles ?? []) nameById[p.id] = p.full_name

  if (!packages || packages.length === 0) {
    return <EmptyPage />
  }

  const totalActive = packages.filter((p) => p.status === "active").length
  const totalMonthly = packages
    .filter((p) => p.status === "active")
    .reduce((s, p) => s + Number(p.monthly_price), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Paketler</h1>
          <p className="text-sm text-zinc-500 mt-1">Tüm öğrencilerinin paketleri.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3">
            <div className="text-xs text-zinc-500">Aktif Paket</div>
            <div className="text-xl font-bold text-zinc-900 tabular-nums">{totalActive}</div>
          </div>
          <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3">
            <div className="text-xs text-zinc-500">Aylık Toplam</div>
            <div className="text-xl font-bold text-zinc-900 tabular-nums">{formatTRY(totalMonthly)}</div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Öğrenci</TableHead>
              <TableHead>Paket</TableHead>
              <TableHead className="text-right">Aylık</TableHead>
              <TableHead>Başlangıç</TableHead>
              <TableHead>Bitiş</TableHead>
              <TableHead>Ödeme Günü</TableHead>
              <TableHead>Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {packages.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Link
                    href={`/koc/ogrenciler/${p.student_id}/odemeler`}
                    className="font-medium hover:text-[#1B6B8A]"
                  >
                    {nameById[p.student_id] ?? "—"}
                  </Link>
                </TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{formatTRY(p.monthly_price)}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(p.start_date)}</TableCell>
                <TableCell className="whitespace-nowrap">{p.end_date ? formatDate(p.end_date) : "—"}</TableCell>
                <TableCell>Ayın {p.payment_day}'i</TableCell>
                <TableCell>
                  <Badge variant={p.status === "active" ? "paid" : p.status === "paused" ? "partial" : "inactive"}>
                    {p.status === "active" ? "Aktif" : p.status === "paused" ? "Durduruldu" : "Sonlandı"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function EmptyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Paketler</h1>
        <p className="text-sm text-zinc-500 mt-1">Tüm öğrencilerinin paketleri.</p>
      </div>
      <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
          <Package className="h-6 w-6 text-zinc-500" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 mb-1">Henüz paket yok</h3>
        <p className="text-sm text-zinc-500">Öğrenci detay sayfasından yeni paket ekleyebilirsin.</p>
      </div>
    </div>
  )
}
