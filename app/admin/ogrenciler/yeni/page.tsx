import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { StudentForm } from "@/blocks/admin/student-form"

export const metadata = { title: "Yeni Öğrenci — KoçUp" }

export default function YeniOgrenciPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/ogrenciler" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 mb-2">
          <ArrowLeft className="h-4 w-4" /> Öğrenciler
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900">Yeni Öğrenci</h1>
        <p className="text-sm text-zinc-500 mt-1">Öğrenci bilgilerini gir, kaydettikten sonra paket ve ödeme ekleyebilirsin.</p>
      </div>
      <div className="bg-white border border-zinc-200 rounded-2xl p-6">
        <StudentForm />
      </div>
    </div>
  )
}
