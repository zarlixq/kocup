import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { ExamForm } from "@/components/shared/exam-form"
import { createExamAction, createExamFromUpplanAction } from "@/app/ogrenci/denemelerim/actions"

export const metadata = { title: "Yeni Deneme — KoçUp" }

export default async function YeniDenemePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const { from } = await searchParams
  const fromUpplan = from === "upplan"
  const supabase = await createClient()

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, exam_type")
    .order("exam_type")
    .order("order")

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href={fromUpplan ? "/ogrenci/upplan/kurulum?adim=deneme" : "/ogrenci/denemelerim"}
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 mb-2"
        >
          <ArrowLeft className="h-4 w-4" /> {fromUpplan ? "UpPlan kurulumu" : "Denemelerim"}
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900">Yeni Deneme</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Çözdüğün denemenin ders bazında sonuçlarını gir. Sadece dolu olan dersler kaydedilir.
        </p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-6">
        <ExamForm subjects={subjects ?? []} onSubmit={fromUpplan ? createExamFromUpplanAction : createExamAction} />
      </div>
    </div>
  )
}
