import Image from "next/image"
import Link from "next/link"
import { SignUpForm } from "@/blocks/admin/sign-up-form"

export const metadata = { title: "Kayıt — KoçUp" }

export default function KayitPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <Image src="/logo.png" alt="KoçUp" width={120} height={44} priority className="object-contain" />
          </Link>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-zinc-900 mb-1">Koç Kaydı</h1>
          <p className="text-sm text-zinc-500 mb-6">Öğrencilerini yönetmek için hesap oluştur.</p>
          <SignUpForm />
          <p className="text-sm text-zinc-500 text-center mt-6">
            Zaten hesabın var mı?{" "}
            <Link href="/admin/giris" className="text-[#1B6B8A] font-semibold hover:underline">
              Giriş yap
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
