import Image from "next/image"
import Link from "next/link"
import { SignInForm } from "@/blocks/admin/sign-in-form"

export const metadata = { title: "Giriş — KoçUp" }

export default function GirisPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <Image src="/logo.png" alt="KoçUp" width={120} height={44} priority className="object-contain" />
          </Link>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-zinc-900 mb-1">Koç Girişi</h1>
          <p className="text-sm text-zinc-500 mb-6">Panele giriş yapmak için bilgilerini gir.</p>
          <SignInForm />
          <p className="text-sm text-zinc-500 text-center mt-6">
            Hesabın yok mu?{" "}
            <Link href="/admin/kayit" className="text-[#1B6B8A] font-semibold hover:underline">
              Kayıt ol
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
