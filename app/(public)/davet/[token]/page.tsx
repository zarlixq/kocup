import type { Metadata } from "next"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { BrandLogo } from "@/components/brand/logo"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { lookupInvitationToken } from "@/lib/invitations/service"
import { AcceptInvitationForm } from "./form"

export const metadata: Metadata = {
  title: "Davet",
  robots: { index: false, follow: false },
}

const REASON: Record<"gecersiz" | "kullanildi" | "suresi_doldu" | "iptal", { title: string; text: string }> = {
  gecersiz: {
    title: "Davet bağlantısı geçersiz",
    text: "Bağlantıyı eksik kopyalamış olabilirsin. E-postadaki bağlantıyı yeniden açmayı dene.",
  },
  kullanildi: {
    title: "Bu davet zaten kullanılmış",
    text: "Hesabın oluşturulmuş. Belirlediğin şifreyle giriş yapabilirsin.",
  },
  suresi_doldu: {
    title: "Davetin süresi dolmuş",
    text: "Davet bağlantıları 7 gün geçerlidir. Seni davet eden kişiden yeni bir davet iste.",
  },
  iptal: {
    title: "Bu davet iptal edilmiş",
    text: "Bir yanlışlık olduğunu düşünüyorsan seni davet eden kişiyle iletişime geç.",
  },
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <BrandLogo className="h-10 w-auto" />
          </Link>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">{children}</div>
      </div>
    </div>
  )
}

export default async function DavetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const lookup = await lookupInvitationToken(supabaseAdmin(), token)

  if (!lookup.ok) {
    const r = REASON[lookup.reason]
    return (
      <Shell>
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <h1 className="mt-3 text-lg font-bold text-zinc-900">{r.title}</h1>
        <p className="mt-2 text-sm text-zinc-600">{r.text}</p>
        <Link href="/giris/ogrenci" className="mt-6 inline-block text-sm font-medium text-[#1B6B8A] hover:underline">
          Giriş sayfasına git
        </Link>
      </Shell>
    )
  }

  const inv = lookup.invitation
  return (
    <Shell>
      <h1 className="text-xl font-bold text-zinc-900">Merhaba {inv.full_name.split(" ")[0]}!</h1>
      <p className="mb-6 mt-1 text-sm text-zinc-500">
        KoçUp hesabını oluşturmak için şifreni belirle. Hesabın <span className="font-medium text-zinc-700">{inv.email}</span>{" "}
        adresiyle açılacak.
      </p>
      <AcceptInvitationForm token={token} />
    </Shell>
  )
}
