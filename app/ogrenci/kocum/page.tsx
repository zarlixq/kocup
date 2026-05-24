import Link from "next/link"
import { ArrowLeft, Mail, Phone, Award, Calendar } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Users } from "lucide-react"
import { formatDate } from "@/lib/format"

export const metadata = { title: "Koçum — KoçUp" }

function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export default async function KocumPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: student } = await supabase
    .from("students")
    .select("coach_id, created_at")
    .eq("id", user!.id)
    .maybeSingle()

  if (!student?.coach_id) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/ogrenci"
            className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 mb-2"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900">Koçum</h1>
        </div>
        <EmptyState
          icon={Users}
          title="Henüz koç atanmamış"
          description="Sana henüz bir koç atanmadı. Lütfen müdürle iletişime geç."
        />
      </div>
    )
  }

  const { data: coach } = await supabase
    .from("profiles")
    .select("full_name, email, phone, bio, certificate_info, years_experience, specialties")
    .eq("id", student.coach_id)
    .maybeSingle()

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/ogrenci"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 mb-2"
        >
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900">Koçum</h1>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="bg-[#1B6B8A] text-white text-xl">
              {initials(coach?.full_name ?? "?")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <h2 className="text-xl font-bold text-zinc-900">{coach?.full_name ?? "—"}</h2>
            {coach?.certificate_info && (
              <Badge variant="paid">
                <Award className="h-3 w-3 mr-1" /> {coach.certificate_info}
              </Badge>
            )}
            <div className="flex flex-col gap-1 text-sm text-zinc-600 pt-2">
              {coach?.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-zinc-400" />
                  <span>{coach.email}</span>
                </div>
              )}
              {coach?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-zinc-400" />
                  <span>{coach.phone}</span>
                </div>
              )}
              {student.created_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-zinc-400" />
                  <span>Atandığın tarih: {formatDate(student.created_at)}</span>
                </div>
              )}
            </div>
            {coach?.specialties && coach.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {coach.specialties.map((s) => (
                  <Badge key={s} variant="outline" className="text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
            )}
            {coach?.years_experience != null && coach.years_experience > 0 && (
              <p className="text-sm text-zinc-500 pt-1">
                {coach.years_experience} yıl deneyim
              </p>
            )}
          </div>
        </div>

        {coach?.bio && (
          <div className="mt-6 pt-6 border-t border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-900 mb-2">Hakkında</h3>
            <p className="text-sm text-zinc-600 whitespace-pre-line leading-relaxed">{coach.bio}</p>
          </div>
        )}

        <p className="text-xs text-zinc-400 mt-6 pt-4 border-t border-zinc-100">
          İletişim için panel mesajlaşmasını veya e-posta yolunu kullan.
        </p>
      </div>
    </div>
  )
}
