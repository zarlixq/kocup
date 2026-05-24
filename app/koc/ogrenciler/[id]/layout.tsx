import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Pencil } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StudentActiveToggle } from "@/components/koc/student-active-toggle"
import { StudentDetailNav } from "@/components/koc/student-detail-nav"

export default async function StudentDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: student }, { data: profile }] = await Promise.all([
    supabase.from("students").select("*").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("full_name, email").eq("id", id).maybeSingle(),
  ])

  if (!student || !profile) notFound()

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/koc/ogrenciler"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 mb-2"
        >
          <ArrowLeft className="h-4 w-4" /> Öğrencilerim
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
              {profile.full_name}
              {!student.is_active && <Badge variant="inactive">Pasif</Badge>}
              <Badge variant={student.kayit_kaynagi === "koc_ekledi" ? "default" : "outline"}>
                {student.kayit_kaynagi === "koc_ekledi" ? "Koç Ekledi" : "Başvuru"}
              </Badge>
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              {student.grade ? `${student.grade}. Sınıf` : "Sınıf belirtilmemiş"}
              {student.school ? ` · ${student.school}` : ""}
              {` · ${profile.email}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StudentActiveToggle id={id} isActive={Boolean(student.is_active)} />
            <Link href={`/koc/ogrenciler/${id}/duzenle`}>
              <Button variant="outline">
                <Pencil className="h-4 w-4" /> Düzenle
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <StudentDetailNav studentId={id} />

      <div>{children}</div>
    </div>
  )
}
