import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { StudentForm } from "@/blocks/admin/student-form"

export default async function StudentEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: student } = await supabase.from("clients").select("*").eq("id", id).maybeSingle()
  if (!student) notFound()

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/ogrenciler/${id}`} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 mb-2">
          <ArrowLeft className="h-4 w-4" /> {student.full_name}
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900">Öğrenciyi Düzenle</h1>
      </div>
      <div className="bg-white border border-zinc-200 rounded-2xl p-6">
        <StudentForm student={student} />
      </div>
    </div>
  )
}
