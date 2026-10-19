import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { SessionForm } from "@/components/soru-cozum/session-form"
import { loadSessionFormData } from "@/lib/soru-cozum/form-data"

export const metadata = { title: "Soru Çözüm Ekle — KoçUp" }

export default async function YeniSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ konu?: string; soru?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const presetTopicId = sp.konu && /^[0-9a-f-]{36}$/i.test(sp.konu) ? sp.konu : null
  const presetTotal = sp.soru && /^\d{1,3}$/.test(sp.soru) ? Number(sp.soru) : null
  const data = await loadSessionFormData(supabase, user!.id, [presetTopicId])

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <Link
          href="/ogrenci/soru-cozum"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 mb-2"
        >
          <ArrowLeft className="h-4 w-4" /> Soru Çözüm
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900">Yeni Soru Çözüm</h1>
        <p className="text-sm text-zinc-500 mt-1">Çözdüğün soruları konu bazında kaydet.</p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-6">
        <SessionForm data={data} mode={{ kind: "create", presetTopicId, presetTotal }} />
      </div>
    </div>
  )
}
