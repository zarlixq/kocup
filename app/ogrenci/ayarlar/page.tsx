import { createClient } from "@/lib/supabase/server"
import { OgrenciPasswordForm } from "@/components/ogrenci/password-form"
import { NotificationPreferencesForm } from "@/components/ogrenci/notification-preferences-form"

export const metadata = { title: "Ayarlar — KoçUp" }

type NotificationPrefs = {
  mesaj_kocum?: boolean
  yeni_konu?: boolean
  randevu_hatirlat?: boolean
  haftalik_ozet?: boolean
}

function parsePrefs(value: unknown): NotificationPrefs {
  if (!value || typeof value !== "object") return {}
  const v = value as Record<string, unknown>
  const out: NotificationPrefs = {}
  if (typeof v.mesaj_kocum === "boolean") out.mesaj_kocum = v.mesaj_kocum
  if (typeof v.yeni_konu === "boolean") out.yeni_konu = v.yeni_konu
  if (typeof v.randevu_hatirlat === "boolean") out.randevu_hatirlat = v.randevu_hatirlat
  if (typeof v.haftalik_ozet === "boolean") out.haftalik_ozet = v.haftalik_ozet
  return out
}

export default async function OgrenciAyarlarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("notification_preferences")
    .eq("id", user!.id)
    .maybeSingle()

  const initial = parsePrefs(profile?.notification_preferences)

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Ayarlar</h1>
        <p className="text-sm text-zinc-500 mt-1">Şifren ve bildirim tercihlerin.</p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-zinc-900 mb-4">Şifre Değiştir</h2>
        <OgrenciPasswordForm />
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-zinc-900 mb-4">Bildirim Tercihleri</h2>
        <NotificationPreferencesForm initial={initial} />
      </div>
    </div>
  )
}
