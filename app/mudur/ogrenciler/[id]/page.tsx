import Link from "next/link"
import { notFound } from "next/navigation"
import { UserCog, GraduationCap, Target, Phone } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

function formatDate(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  })
}

export default async function StudentOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: profile }, { data: student }, { data: coaches }] = await Promise.all([
    supabase.from("profiles").select("created_at").eq("id", id).maybeSingle(),
    supabase.from("students").select("*").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("id, full_name").eq("role", "coach"),
  ])

  if (!student) notFound()

  const coach = student.coach_id
    ? (coaches ?? []).find((c) => c.id === student.coach_id) ?? null
    : null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card title="Atanmış Koç" icon={UserCog}>
        {coach ? (
          <div>
            <div className="font-medium text-zinc-900">{coach.full_name}</div>
            <Link
              href={`/mudur/koclar/${coach.id}`}
              className="text-xs text-[#1B6B8A] hover:underline mt-1 inline-block"
            >
              Koç detayı →
            </Link>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Atanmamış</p>
        )}
      </Card>

      <Card title="Hedef" icon={Target}>
        {student.target_university || student.target_department || student.target_ranking ? (
          <div className="space-y-1 text-sm">
            {student.target_university && (
              <div>
                <span className="text-zinc-500">Üniversite: </span>
                <span className="text-zinc-900">{student.target_university}</span>
              </div>
            )}
            {student.target_department && (
              <div>
                <span className="text-zinc-500">Bölüm: </span>
                <span className="text-zinc-900">{student.target_department}</span>
              </div>
            )}
            {student.target_ranking && (
              <div>
                <span className="text-zinc-500">Sıralama: </span>
                <span className="text-zinc-900">
                  {student.target_ranking.toLocaleString("tr-TR")}
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Hedef belirtilmemiş</p>
        )}
      </Card>

      <Card title="Veli Bilgisi" icon={Phone}>
        {student.parent_name || student.parent_phone ? (
          <div className="space-y-1 text-sm">
            {student.parent_name && <div className="text-zinc-900 font-medium">{student.parent_name}</div>}
            {student.parent_phone && <div className="text-zinc-500">{student.parent_phone}</div>}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Veli bilgisi yok</p>
        )}
      </Card>

      <Card title="Kayıt" icon={GraduationCap}>
        <p className="text-sm text-zinc-900">{formatDate(profile?.created_at ?? null)}</p>
        <p className="text-xs text-zinc-500 mt-1">
          Kaynak: {student.kayit_kaynagi === "koc_ekledi" ? "Koç Ekledi" : "Başvuru"}
        </p>
      </Card>

      {student.school && (
        <Card title="Okul" icon={GraduationCap}>
          <p className="text-sm text-zinc-900">{student.school}</p>
        </Card>
      )}

      {student.notes && (
        <Card title="Notlar" icon={Phone}>
          <p className="text-sm text-zinc-700 whitespace-pre-line">{student.notes}</p>
        </Card>
      )}
    </div>
  )
}

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof UserCog
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-zinc-400" />
        <span className="text-sm font-medium text-zinc-600">{title}</span>
      </div>
      {children}
    </div>
  )
}
