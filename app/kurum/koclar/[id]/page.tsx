import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  UserCog,
  GraduationCap,
  Award,
  Mail,
  Phone,
  Calendar,
} from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getCurrentProfile } from "@/lib/auth/current-user"
import { ResendInviteButton } from "@/components/shared/resend-invite-button"
import { RemoveCoachButton } from "@/components/kurum/remove-coach-button"
import { UserStatusBadge } from "@/components/shared/user-status-badge"
import { getUserStatus } from "@/lib/user-status"
import { resendCoachInvitationKurum } from "@/app/kurum/actions"
import { formatDate } from "@/lib/format"

function initials(name: string) {
  return name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()
}

export default async function KurumCoachDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const me = await getCurrentProfile()
  const orgId = me!.organization_id!

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, phone, bio, certificate_info, years_experience, specialties, created_at, organization_id, role, first_login_at",
    )
    .eq("id", id)
    .maybeSingle()

  // RLS zaten kontrolü yapıyor (organizations + profiles policies), ama belt-and-suspenders.
  if (!profile || profile.role !== "coach" || profile.organization_id !== orgId) {
    notFound()
  }

  // Atanmış öğrenciler (kurum scope)
  const { data: students } = await supabase
    .from("students")
    .select("id, grade, is_active, created_at")
    .eq("coach_id", id)
    .order("created_at", { ascending: false })

  const studentIds = (students ?? []).map((s) => s.id)
  const { data: studentProfiles } = studentIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", studentIds)
    : { data: [] as { id: string; full_name: string }[] }
  const nameById = new Map((studentProfiles ?? []).map((p) => [p.id, p.full_name]))

  // Status: profiles.first_login_at üzerinden — auth.users fetch'i gerek yok
  const status = getUserStatus({ first_login_at: profile.first_login_at })
  const hasLoggedIn = status !== "pending"

  const studentCount = (students ?? []).length
  const activeStudentCount = (students ?? []).filter((s) => s.is_active).length

  // Server action wrapper (Client Component'e geçilebilir hale getir)
  async function handleResend() {
    "use server"
    return resendCoachInvitationKurum(id)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link
        href="/kurum/koclar"
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
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-zinc-900">{profile.full_name}</h1>
              <UserStatusBadge status={status} />
            </div>
            <div className="flex items-center gap-3 text-sm text-zinc-500 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> {profile.email}
              </span>
              {profile.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> {profile.phone}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-zinc-400">
                <Calendar className="w-3.5 h-3.5" /> Katılım: {formatDate(profile.created_at)}
              </span>
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
          <div className="flex flex-col gap-2 shrink-0">
            {!hasLoggedIn && (
              <ResendInviteButton
                userName={profile.full_name}
                email={profile.email}
                action={handleResend}
              />
            )}
            <RemoveCoachButton
              coachId={profile.id}
              coachName={profile.full_name}
              studentCount={studentCount}
              activeStudentCount={activeStudentCount}
            />
          </div>
        </div>

        {profile.bio && (
          <div className="mt-5 pt-5 border-t border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-900 mb-2">Hakkında</h3>
            <p className="text-sm text-zinc-600 whitespace-pre-line leading-relaxed">
              {profile.bio}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          icon={<GraduationCap className="h-4 w-4" />}
          label="Toplam Öğrenci"
          value={String(studentCount)}
          color="bg-blue-50 text-blue-700"
        />
        <StatCard
          icon={<UserCog className="h-4 w-4" />}
          label="Aktif Öğrenci"
          value={String(activeStudentCount)}
          color="bg-green-50 text-green-700"
        />
        <StatCard
          icon={<Calendar className="h-4 w-4" />}
          label="Hesap Durumu"
          value={hasLoggedIn ? "Aktif" : "Davet Bekliyor"}
          color={hasLoggedIn ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}
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
                  <TableHead>Durum</TableHead>
                  <TableHead>Kayıt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(students ?? []).map((s) => (
                  <TableRow key={s.id} className={!s.is_active ? "opacity-50" : undefined}>
                    <TableCell>
                      <span className="font-medium text-zinc-900">
                        {nameById.get(s.id) ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>{s.grade ? `${s.grade}. Sınıf` : "—"}</TableCell>
                    <TableCell>
                      {s.is_active ? (
                        <Badge variant="paid">Aktif</Badge>
                      ) : (
                        <Badge variant="inactive">Pasif</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-zinc-600">
                      {s.created_at ? formatDate(s.created_at) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
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
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <div className="text-lg font-bold text-zinc-900 tabular-nums">{value}</div>
    </div>
  )
}
