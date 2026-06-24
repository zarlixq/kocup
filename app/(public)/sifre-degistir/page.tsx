import Link from "next/link"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { SifreDegistirForm } from "./form"
import { BrandLogo } from "@/components/brand/logo"

export const metadata: Metadata = {
  title: "Şifre Değiştir",
  description: "İlk girişte geçici şifrenizi değiştirin.",
  robots: { index: false, follow: false },
}

const ROLE_DEST: Record<string, string> = {
  student: "/ogrenci",
  coach: "/koc",
  admin: "/mudur",
  org_admin: "/kurum",
}

export default async function SifreDegistir() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/giris/koc?error=oturum_yok")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, must_change_password")
    .eq("id", user.id)
    .maybeSingle()

  const destination = ROLE_DEST[profile?.role ?? ""] ?? "/ogrenci"

  // Zorunlu değişim gerekmiyorsa bu sayfaya gelinmemeli → panele gönder
  if (!profile?.must_change_password) {
    redirect(destination)
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <BrandLogo className="h-10 w-auto" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm">
          <h1 className="text-xl font-bold text-zinc-900 mb-1">Şifreni Değiştir</h1>
          <p className="text-sm text-zinc-500 mb-6">
            Hesabına geçici bir şifreyle giriş yaptın. Devam etmek için kendi şifreni belirle.
          </p>

          <SifreDegistirForm destination={destination} />
        </div>
      </div>
    </div>
  )
}
