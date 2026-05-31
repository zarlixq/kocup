import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ProfileForm } from "@/components/mudur/profile-form"
import { formatDate } from "@/lib/format"

export const metadata = { title: "Profilim — Müdür" }

function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export default async function MudurProfilimPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { count: coachCount }, { count: studentCount }, { count: pendingCount }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, email, phone, created_at")
        .eq("id", user!.id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "coach"),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "student"),
      supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
    ])

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Profilim</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Yönetici hesabı bilgilerin.
        </p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-6 flex flex-col sm:flex-row items-start gap-5">
        <Avatar className="h-20 w-20">
          <AvatarFallback className="bg-[#1B6B8A] text-white text-xl">
            {initials(profile?.full_name ?? "?")}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <h2 className="text-lg font-bold text-zinc-900">{profile?.full_name ?? "—"}</h2>
          <p className="text-sm text-zinc-600">{profile?.email ?? user?.email}</p>
          {profile?.phone && <p className="text-sm text-zinc-600">{profile.phone}</p>}
          <p className="text-xs text-zinc-400 pt-2">
            Müdür sıfatıyla{" "}
            {profile?.created_at ? formatDate(profile.created_at) : "—"} tarihinden beri
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:min-w-[280px]">
          <Stat label="Koç" value={coachCount ?? 0} />
          <Stat label="Öğrenci" value={studentCount ?? 0} />
          <Stat label="Bekleyen" value={pendingCount ?? 0} accent />
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-zinc-900 mb-4">Profili Düzenle</h2>
        <ProfileForm
          fullName={profile?.full_name ?? ""}
          phone={profile?.phone ?? ""}
          email={profile?.email ?? user?.email ?? ""}
        />
      </div>

      <div className="text-sm text-zinc-500">
        Şifreni değiştirmek için{" "}
        <Link href="/mudur/ayarlar" className="text-[#1B6B8A] font-medium hover:underline">
          Ayarlar
        </Link>{" "}
        sayfasına git.
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div
      className={
        "rounded-lg px-3 py-2 text-center " +
        (accent ? "bg-orange-50 text-[#F97316]" : "bg-zinc-50 text-zinc-700")
      }
    >
      <div className="text-xs">{label}</div>
      <div className={"text-lg font-bold tabular-nums " + (accent ? "" : "text-zinc-900")}>
        {value}
      </div>
    </div>
  )
}
