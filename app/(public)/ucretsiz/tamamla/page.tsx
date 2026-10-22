import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { BrandLogo } from "@/components/brand/logo"
import { createClient } from "@/lib/supabase/server"
import { parseUtm } from "@/lib/analytics/utm"
import { isGoogleUser } from "@/lib/auth/oauth"
import { TamamlaForm } from "./form"

export const metadata: Metadata = {
  title: "Hesabını Tamamla",
  robots: { index: false, follow: false },
}

const ROLE_HOME: Record<string, string> = { student: "/ogrenci", coach: "/koc", admin: "/mudur", org_admin: "/kurum" }

// Google ile ilk giriş: sınıf/alan ve yasal onaylar. Profil varsa kendi paneline.
export default async function TamamlaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/ucretsiz")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (profile) redirect(ROLE_HOME[profile.role] ?? "/")
  if (!isGoogleUser(user)) redirect("/ucretsiz")

  const sp = await searchParams
  const qs = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v] as [string, string]] : [])),
  ).toString()
  const meta = user.user_metadata as { full_name?: unknown; name?: unknown }
  const name = typeof meta.full_name === "string" ? meta.full_name : typeof meta.name === "string" ? meta.name : ""

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <Link href="/" className="mb-6 flex justify-center" aria-label="KoçUp ana sayfa">
          <BrandLogo className="h-9 w-auto" />
        </Link>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-7">
          <h1 className="text-xl font-bold text-zinc-900">{name ? `Hoş geldin, ${name.split(" ")[0]}!` : "Hoş geldin!"}</h1>
          <p className="mb-5 mt-1 text-sm text-zinc-500">Planını çıkarabilmemiz için iki kısa bilgi ve onaylar kaldı.</p>
          <TamamlaForm utm={parseUtm(qs)} />
        </div>
      </div>
    </div>
  )
}
