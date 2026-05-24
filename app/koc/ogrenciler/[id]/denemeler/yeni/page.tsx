import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { KocExamFormWrapper } from "@/components/koc/exam-form-wrapper"

export const metadata = { title: "Yeni Deneme — KoçUp" }

export default async function KocYeniDenemePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: subjects }, { data: profile }] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, name, exam_type")
      .order("exam_type")
      .order("order"),
    supabase.from("profiles").select("full_name").eq("id", id).maybeSingle(),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href={`/koc/ogrenciler/${id}/denemeler`}
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 mb-2"
        >
          <ArrowLeft className="h-4 w-4" /> Denemeler
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900">Yeni Deneme</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {profile?.full_name ?? "Öğrenci"} için yeni deneme sonucu gir.
        </p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-6">
        <KocExamFormWrapper studentId={id} subjects={subjects ?? []} />
      </div>
    </div>
  )
}
