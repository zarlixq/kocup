import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { SessionForm } from "@/components/soru-cozum/session-form"
import { loadSessionFormData } from "@/lib/soru-cozum/form-data"

export const metadata = { title: "Soru Çözüm Düzenle — KoçUp" }

export default async function DuzenleSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: session }, data] = await Promise.all([
    supabase
      .from("study_sessions")
      .select("id, subject_id, topic_id, date, total_questions, correct, wrong, empty, duration_minutes, resource_id, assignment_id")
      .eq("id", id)
      .eq("student_id", user!.id)
      .maybeSingle(),
    loadSessionFormData(supabase, user!.id),
  ])

  if (!session) notFound()

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <Link
          href="/ogrenci/soru-cozum"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 mb-2"
        >
          <ArrowLeft className="h-4 w-4" /> Soru Çözüm
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900">Kaydı Düzenle</h1>
        <p className="text-sm text-zinc-500 mt-1">Düzenlenen kayıtlar koçunun panelinde &quot;düzenlendi&quot; olarak görünür.</p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-6">
        <SessionForm
          data={data}
          mode={{
            kind: "edit",
            sessionId: session.id,
            locked: session.assignment_id != null,
            initial: {
              subject_id: session.subject_id,
              topic_id: session.topic_id,
              date: session.date,
              total: session.total_questions,
              correct: session.correct,
              wrong: session.wrong,
              empty: session.empty,
              duration_minutes: session.duration_minutes,
              resource_id: session.resource_id,
            },
          }}
        />
      </div>
    </div>
  )
}
