import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SifreBelirleForm } from "./form"

export const metadata = { title: "Şifre Belirle — KoçUp" }

export default async function SifreBelirle() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/giris/koc?error=oturum_yok")
  }

  // Davet metadata'sından role oku; profiles oluşmamış olabilir (trigger SECURITY DEFINER,
  // çoğu durumda mevcut ama garanti değil)
  const role =
    (user.user_metadata?.role as string | undefined) ??
    (await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()).data?.role

  const destination =
    role === "coach" ? "/koc" :
    role === "admin" ? "/mudur" :
    "/ogrenci"

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <Image src="/images/logo.png" alt="KoçUp" width={120} height={40} className="h-10 w-auto" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm">
          <h1 className="text-xl font-bold text-zinc-900 mb-1">Şifreni Belirle</h1>
          <p className="text-sm text-zinc-500 mb-6">
            Hesabın için güçlü bir şifre oluştur.
          </p>

          <SifreBelirleForm destination={destination} />
        </div>
      </div>
    </div>
  )
}
