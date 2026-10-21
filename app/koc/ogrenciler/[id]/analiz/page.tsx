import { notFound } from "next/navigation"
import { Eye } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { AnalizDashboard } from "@/components/analiz/analiz-dashboard"

// Öğrencinin Analizim sayfasının salt okunur hali (aynı bileşenler).
export default async function KocStudentAnalizPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: student } = await supabase.from("students").select("id, coach_id").eq("id", id).maybeSingle()
  if (!student || student.coach_id !== user!.id) notFound()

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-1.5 text-xs text-zinc-500">
        <Eye className="h-3.5 w-3.5" /> Öğrencinin Analizim sayfasının salt okunur görünümü.
      </p>
      <AnalizDashboard studentId={id} mode="coach" basePath={`/koc/ogrenciler/${id}/analiz`} searchParams={sp} />
    </div>
  )
}
