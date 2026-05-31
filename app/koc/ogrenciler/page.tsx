import Link from "next/link"
import { Plus, Users } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { currentPeriodMonthISO, getPaymentStatus, statusLabel } from "@/lib/payments"
import { StudentSearch } from "@/components/koc/student-search"
import { UserStatusBadge } from "@/components/shared/user-status-badge"
import { getUserStatus } from "@/lib/user-status"

export const metadata = { title: "Öğrencilerim — KoçUp" }

type SearchParams = { q?: string; filtre?: string; kaynak?: string }

export default async function OgrencilerPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const q = (sp.q ?? "").trim()
  const filter = sp.filtre ?? "aktif"
  const source = sp.kaynak ?? "tum"

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let studentQ = supabase
    .from("students")
    .select(
      `id, school, grade, is_active, kayit_kaynagi, created_at,
       packages(id, monthly_price, status, name),
       payments(amount, period_month)`
    )
    .eq("coach_id", user!.id)
    .order("created_at", { ascending: false })

  if (filter === "aktif") studentQ = studentQ.eq("is_active", true)
  else if (filter === "pasif") studentQ = studentQ.eq("is_active", false)
  if (source !== "tum") studentQ = studentQ.eq("kayit_kaynagi", source)
  if (q) studentQ = studentQ.ilike("school", `%${q}%`)

  const { data: students } = await studentQ

  const studentIds = (students ?? []).map((s) => s.id)
  const { data: profiles } = studentIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email, first_login_at")
        .in("id", studentIds)
    : { data: [] as { id: string; full_name: string; email: string; first_login_at: string | null }[] }

  const profileById: Record<string, { full_name: string; email: string; first_login_at: string | null }> = {}
  for (const p of profiles ?? []) {
    profileById[p.id] = { full_name: p.full_name, email: p.email, first_login_at: p.first_login_at }
  }

  // İsim/email araması (profiles üzerinden) — student-side filtre ile birleştir
  let visibleStudents = students ?? []
  if (q) {
    const ql = q.toLocaleLowerCase("tr-TR")
    visibleStudents = visibleStudents.filter((s) => {
      const p = profileById[s.id]
      const name = p?.full_name?.toLocaleLowerCase("tr-TR") ?? ""
      const school = s.school?.toLocaleLowerCase("tr-TR") ?? ""
      return name.includes(ql) || school.includes(ql)
    })
  }

  const periodIso = currentPeriodMonthISO()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Öğrencilerim</h1>
          <p className="text-sm text-zinc-500 mt-1">Sana atanmış öğrencileri buradan yönet.</p>
        </div>
        <Link href="/koc/ogrenciler/yeni">
          <Button variant="accent">
            <Plus className="h-4 w-4" />
            Yeni Öğrenci
          </Button>
        </Link>
      </div>

      <StudentSearch defaultQ={q} defaultFilter={filter} defaultSource={source} />

      {visibleStudents.length === 0 ? (
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
            <Link href="/koc/ogrenciler/yeni">
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
                <TableHead>Kaynak</TableHead>
                <TableHead>Aktif Paket</TableHead>
                <TableHead>Bu Ay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleStudents.map((s) => {
                const profile = profileById[s.id]
                const active = s.packages?.find((p) => p.status === "active")
                const paymentsThisMonth = (s.payments ?? []).filter((p) => p.period_month === periodIso)
                const status = active
                  ? getPaymentStatus(paymentsThisMonth, active.monthly_price)
                  : "pending"
                const userStatus = getUserStatus({
                  first_login_at: profile?.first_login_at ?? null,
                  is_active: s.is_active,
                })
                return (
                  <TableRow key={s.id} className={userStatus === "inactive" ? "opacity-50 cursor-pointer" : "cursor-pointer"}>
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/koc/ogrenciler/${s.id}`} className="font-medium text-zinc-900 hover:text-[#1B6B8A]">
                          {profile?.full_name ?? "—"}
                        </Link>
                        <UserStatusBadge status={userStatus} size="sm" />
                      </div>
                      <span className="text-xs text-zinc-500">{profile?.email}</span>
                    </TableCell>
                    <TableCell>{s.grade ?? "-"}</TableCell>
                    <TableCell>{s.school ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={s.kayit_kaynagi === "koc_ekledi" ? "default" : "outline"}>
                        {s.kayit_kaynagi === "koc_ekledi" ? "Koç Ekledi" : "Başvuru"}
                      </Badge>
                    </TableCell>
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
