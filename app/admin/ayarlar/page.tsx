import { createClient } from "@/lib/supabase/server"
import { ProfileForm } from "@/blocks/admin/profile-form"
import { PasswordForm } from "@/blocks/admin/password-form"

export const metadata = { title: "Ayarlar — KoçUp" }

export default async function AyarlarPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: coach } = await supabase.from("coaches").select("*").eq("id", user!.id).maybeSingle()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Ayarlar</h1>
        <p className="text-sm text-zinc-500 mt-1">Profil bilgilerini ve şifreni yönet.</p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-zinc-900 mb-4">Profil</h2>
        <ProfileForm
          fullName={coach?.full_name ?? ""}
          phone={coach?.phone ?? ""}
          email={user?.email ?? ""}
        />
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-zinc-900 mb-4">Şifre Değiştir</h2>
        <PasswordForm />
      </div>
    </div>
  )
}
