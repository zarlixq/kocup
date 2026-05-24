import { createClient } from "@/lib/supabase/server"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { CoachProfileForm } from "@/components/koc/coach-profile-form"
import { formatDate } from "@/lib/format"

export const metadata = { title: "Profilim — KoçUp" }

function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export default async function KocProfilimPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { count: studentCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, phone, bio, certificate_info, years_experience, specialties, created_at")
      .eq("id", user!.id)
      .maybeSingle(),
    supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("coach_id", user!.id),
  ])

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Profilim</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Bilgilerin landing sayfasında ve öğrencilerinin panelinde görünür.
        </p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-6 flex flex-col sm:flex-row items-start gap-5">
        <Avatar className="h-20 w-20">
          <AvatarFallback className="bg-[#1B6B8A] text-white text-xl">
            {initials(profile?.full_name ?? "?")}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <h2 className="text-lg font-bold text-zinc-900">{profile?.full_name}</h2>
          <p className="text-sm text-zinc-600">{profile?.email}</p>
          {profile?.phone && <p className="text-sm text-zinc-600">{profile.phone}</p>}
          {profile?.certificate_info && (
            <Badge variant="paid" className="mt-2">
              {profile.certificate_info}
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:min-w-[200px]">
          <div className="bg-zinc-50 rounded-lg px-3 py-2 text-center">
            <div className="text-xs text-zinc-500">Öğrenci</div>
            <div className="text-lg font-bold text-zinc-900 tabular-nums">{studentCount ?? 0}</div>
          </div>
          <div className="bg-zinc-50 rounded-lg px-3 py-2 text-center">
            <div className="text-xs text-zinc-500">Kayıt</div>
            <div className="text-sm font-medium text-zinc-900">
              {profile?.created_at ? formatDate(profile.created_at) : "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-zinc-900 mb-4">Profili Düzenle</h2>
        <CoachProfileForm
          initial={{
            full_name: profile?.full_name ?? "",
            phone: profile?.phone ?? "",
            bio: profile?.bio ?? "",
            certificate_info: profile?.certificate_info ?? "",
            years_experience: profile?.years_experience?.toString() ?? "",
            specialties: (profile?.specialties ?? []).join(", "),
          }}
        />
      </div>
    </div>
  )
}
