import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { ExamForm, type ExamFormInput } from "@/components/shared/exam-form"
import { updateExamAction } from "@/app/ogrenci/denemelerim/actions"

export const metadata = { title: "Deneme Düzenle — KoçUp" }

const EXAM_TYPES: ExamFormInput["exam_type"][] = ["tyt", "ayt", "tyt_ayt", "lgs", "okul"]

export default async function DenemeDuzenlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: exam }, { data: subjects }] = await Promise.all([
    supabase
      .from("exams")
      .select("id, name, exam_type, date, siralama, notes, pdf_path, exam_results(subject_id, correct, wrong, empty)")
      .eq("id", id)
      .eq("student_id", user!.id)
      .maybeSingle(),
    supabase.from("subjects").select("id, name, exam_type").order("exam_type").order("order"),
  ])

  if (!exam) notFound()

  const examType = EXAM_TYPES.find((t) => t === exam.exam_type) ?? "okul"

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href={`/ogrenci/denemelerim/${exam.id}`}
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 mb-2"
        >
          <ArrowLeft className="h-4 w-4" /> {exam.name}
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900">Denemeyi Düzenle</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Düzenlenen denemeler koçunun panelinde &quot;düzenlendi&quot; olarak görünür.
        </p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-6">
        <ExamForm
          subjects={subjects ?? []}
          onSubmit={updateExamAction.bind(null, exam.id)}
          submitLabel="Değişiklikleri Kaydet"
          hasExistingPdf={exam.pdf_path != null}
          initial={{
            name: exam.name,
            exam_type: examType,
            date: exam.date,
            siralama: exam.siralama,
            notes: exam.notes,
            results: exam.exam_results ?? [],
          }}
        />
      </div>
    </div>
  )
}
