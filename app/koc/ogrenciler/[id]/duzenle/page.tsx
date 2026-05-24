import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StudentForm } from "@/components/koc/student-form"

export default async function StudentEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: student }, { data: profile }] = await Promise.all([
    supabase.from("students").select("*").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("full_name, email, phone").eq("id", id).maybeSingle(),
  ])

  if (!student || !profile) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">Öğrenciyi Düzenle</h2>
      </div>
      <div className="bg-white border border-zinc-200 rounded-2xl p-6">
        <StudentForm
          student={{
            id,
            full_name: profile.full_name,
            email: profile.email,
            phone: profile.phone,
            school: student.school,
            grade: student.grade,
            parent_name: student.parent_name,
            parent_phone: student.parent_phone,
            notes: student.notes,
          }}
        />
      </div>
    </div>
  )
}
