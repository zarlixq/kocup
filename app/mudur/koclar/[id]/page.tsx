import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, UserCog, GraduationCap, Wallet, Package, TrendingUp, Mail, Phone, Award } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatTRY } from "@/lib/format"
import { currentPeriodMonthISO } from "@/lib/payments"
import { EditCoachDialog } from "@/components/mudur/edit-coach-dialog"
import { DeleteCoachButton } from "@/components/mudur/delete-coach-button"

function initials(name: string) {
  return name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()
}

function formatDate(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  })
}

export default async function CoachDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, bio, certificate_info, years_experience, specialties, created_at, role")
    .eq("id", id)
    .maybeSingle()

  if (!profile || profile.role !== "coach") notFound()

  const { data: students } = await supabase
    .from("students")
    .select("id, grade, is_active, created_at, packages(monthly_price, status)")
    .eq("coach_id", id)
    .order("created_at", { ascending: false })

  const studentIds = (students ?? []).map((s) => s.id)
  const { data: studentProfiles } = studentIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", studentIds)
    : { data: [] as { id: string; full_name: string }[] }

  const nameById: Record<string, string> = {}
  for (const p of studentProfiles ?? []) nameById[p.id] = p.full_name

  const periodIso = currentPeriodMonthISO()
  const { data: allPayments } = studentIds.length
    ? await supabase
        .from("payments")
        .select("amount, period_month, student_id")
        .in("student_id", studentIds)
    : { data: [] as { amount: number; period_month: string; student_id: string }[] }

  const totalCollected = (allPayments ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const monthCollected = (allPayments ?? [])
    .filter((p) => p.period_month === periodIso)
    .reduce((s, p) => s + Number(p.amount), 0)

  const activePackageCount = (students ?? []).reduce(
    (sum, s) => sum + (s.packages?.filter((p) => p.status === "active").length ?? 0),
    0
  )

  const studentCount = (students ?? []).length

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link
        href="/mudur/koclar"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Koçlar listesi
      </Link>

      <div className="bg-white border border-zinc-200 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-[#1B6B8A] text-white text-lg">
              {initials(profile.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <h1 className="text-2xl font-bold text-zinc-900">{profile.full_name}</h1>
            <div className="flex items-center gap-3 text-sm text-zinc-500 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> {profile.email}
              </span>
              {profile.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> {profile.phone}
                </span>
              )}
              <span className="text-zinc-400">Kayıt: {formatDate(profile.created_at)}</span>
            </div>
            {profile.certificate_info && (
              <Badge variant="paid">
                <Award className="w-3 h-3 mr-1" />
                {profile.certificate_info}
              </Badge>
            )}
            {profile.specialties && profile.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {profile.specialties.map((s) => (
                  <Badge key={s} variant="outline" className="text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
            )}
            {profile.years_experience != null && profile.years_experience > 0 && (
              <p className="text-sm text-zinc-500">{profile.years_experience} yıl deneyim</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <EditCoachDialog
              coachId={profile.id}
              initial={{
                full_name: profile.full_name,
                phone: profile.phone ?? "",
                bio: profile.bio ?? "",
                certificate_info: profile.certificate_info ?? "",
                years_experience: profile.years_experience?.toString() ?? "",
                specialties: (profile.specialties ?? []).join(", "),
              }}
            />
            <DeleteCoachButton
              coachId={profile.id}
              coachName={profile.full_name}
              studentCount={studentCount}
            />
          </div>
        </div>

        {profile.bio && (
          <div className="mt-5 pt-5 border-t border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-900 mb-2">Hakkında</h3>
            <p className="text-sm text-zinc-600 whitespace-pre-line leading-relaxed">{profile.bio}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<GraduationCap className="h-4 w-4" />}
          label="Öğrenci"
          value={String(studentCount)}
          color="bg-blue-50 text-blue-700"
        />
        <StatCard
          icon={<Package className="h-4 w-4" />}
          label="Aktif Paket"
          value={String(activePackageCount)}
          color="bg-purple-50 text-purple-700"
        />
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          label="Bu Ay Tahsilat"
          value={formatTRY(monthCollected)}
          color="bg-green-50 text-green-700"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Toplam Tahsilat"
          value={formatTRY(totalCollected)}
          color="bg-orange-50 text-[#F97316]"
        />
      </div>

      <section>
        <h2 className="text-base font-semibold text-zinc-900 mb-3">Atanmış Öğrenciler</h2>
        {studentCount === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
            <UserCog className="h-6 w-6 text-zinc-400 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">Bu koça henüz öğrenci atanmamış.</p>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Öğrenci</TableHead>
                  <TableHead>Sınıf</TableHead>
                  <TableHead>Aktif Paket</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Kayıt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(students ?? []).map((s) => {
                  const activePkg = s.packages?.find((p) => p.status === "active")
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Link
                          href={`/mudur/ogrenciler/${s.id}`}
                          className="font-medium hover:text-[#1B6B8A]"
                        >
                          {nameById[s.id] ?? "—"}
                        </Link>
                      </TableCell>
                      <TableCell>{s.grade ? `${s.grade}. Sınıf` : "—"}</TableCell>
                      <TableCell>
                        {activePkg ? formatTRY(activePkg.monthly_price) : <span className="text-zinc-400">—</span>}
                      </TableCell>
                      <TableCell>
                        {s.is_active ? (
                          <Badge variant="paid">Aktif</Badge>
                        ) : (
                          <Badge variant="inactive">Pasif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-zinc-600">{formatDate(s.created_at)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-zinc-500">{label}</div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
      </div>
      <div className="text-2xl font-bold text-zinc-900 tabular-nums">{value}</div>
    </div>
  )
}
