import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { SessionForm } from "@/components/ogrenci/session-form"

export const metadata = { title: "Soru Çözüm Ekle — KoçUp" }

export default async function YeniSessionPage() {
  const supabase = await createClient()

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, exam_type")
    .order("exam_type")
    .order("order")

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/ogrenci/soru-cozum"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 mb-2"
        >
          <ArrowLeft className="h-4 w-4" /> Soru Çözüm
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900">Yeni Soru Çözüm</h1>
        <p className="text-sm text-zinc-500 mt-1">Bugünkü çalışmanı kaydet.</p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-6">
        <SessionForm subjects={subjects ?? []} />
      </div>
    </div>
  )
}
