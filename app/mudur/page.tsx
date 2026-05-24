import Link from "next/link"
import { UserCog, GraduationCap, Clock, BookOpenCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { StatsCard } from "@/components/mudur/stats-card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export const metadata = { title: "Müdür Paneli — KoçUp" }

const STATUS_LABEL: Record<string, { label: string; variant: "pending" | "paid" | "inactive" }> = {
  pending: { label: "Bekliyor", variant: "pending" },
  approved: { label: "Onaylandı", variant: "paid" },
  rejected: { label: "Reddedildi", variant: "inactive" },
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export default async function MudurDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10)

  const [
    { data: profile },
    { count: coachCount },
    { count: studentCount },
    { count: pendingCount },
    { data: weekSessions },
    { data: recentApps },
  ] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user!.id).maybeSingle(),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "coach"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
    supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("study_sessions").select("total_questions").gte("date", sevenDaysAgoStr),
    supabase
      .from("applications")
      .select("id, full_name, email, created_at, status")
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  const weekTotal = (weekSessions ?? []).reduce((sum, row) => sum + (row.total_questions ?? 0), 0)

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">
          Merhaba, {profile?.full_name}
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Yönetim paneline hoş geldiniz.</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          icon={UserCog}
          color="blue"
          title="Toplam Koç"
          value={coachCount ?? 0}
          subtitle="Aktif"
        />
        <StatsCard
          icon={GraduationCap}
          color="green"
          title="Toplam Öğrenci"
          value={studentCount ?? 0}
          subtitle="Kayıtlı"
        />
        <StatsCard
          icon={Clock}
          color="orange"
          title="Bekleyen Başvuru"
          value={pendingCount ?? 0}
          subtitle="Başvuruları görüntüle →"
          href="/mudur/basvurular"
        />
        <StatsCard
          icon={BookOpenCheck}
          color="purple"
          title="Bu Hafta Soru"
          value={weekTotal.toLocaleString("tr-TR")}
          subtitle="Son 7 gün"
        />
      </div>

      <section className="bg-white border border-zinc-200 rounded-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-900">Son Başvurular</h2>
          <Link
            href="/mudur/basvurular"
            className="text-sm font-medium text-[#1B6B8A] hover:underline"
          >
            Tümünü Gör →
          </Link>
        </div>

        {!recentApps || recentApps.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            Henüz başvuru yok.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad Soyad</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead className="text-right">Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentApps.map((app) => {
                const s = STATUS_LABEL[app.status] ?? STATUS_LABEL.pending
                return (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium text-zinc-900">{app.full_name}</TableCell>
                    <TableCell className="text-zinc-600">{app.email}</TableCell>
                    <TableCell className="text-zinc-600">
                      {app.created_at ? formatDate(app.created_at) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  )
}
