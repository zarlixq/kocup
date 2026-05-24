import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, UserCog, GraduationCap, Target, Phone, Mail } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { StudentDetailActions } from "@/components/mudur/student-detail-actions"

function initials(name: string) {
  return name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()
}

function formatDate(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  })
}

type Params = Promise<{ id: string }>

export default async function StudentDetailPage({ params }: { params: Params }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: profile }, { data: student }, { data: coaches }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, created_at, role")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("students")
      .select("*")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "coach")
      .order("full_name"),
  ])

  if (!profile || profile.role !== "student") notFound()

  const coach = student?.coach_id
    ? (coaches ?? []).find((c) => c.id === student.coach_id) ?? null
    : null

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/mudur/ogrenciler"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Öğrenciler listesi
      </Link>

      <div className="bg-white border border-zinc-200 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-[#1B6B8A] text-white text-lg">
                {initials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">{profile.full_name}</h1>
              <div className="flex items-center gap-3 text-sm text-zinc-500 mt-1">
                <span className="inline-flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> {profile.email}
                </span>
                {profile.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> {profile.phone}
                  </span>
                )}
              </div>
              {student?.grade && (
                <Badge variant="outline" className="mt-2">
                  {student.grade === "Mezun" ? "Mezun" : `${student.grade}. Sınıf`}
                </Badge>
              )}
            </div>
          </div>

          <StudentDetailActions
            studentId={id}
            studentName={profile.full_name}
            currentCoachId={student?.coach_id ?? null}
            coaches={coaches ?? []}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card title="Atanmış Koç" icon={UserCog}>
          {coach ? (
            <div>
              <div className="font-medium text-zinc-900">{coach.full_name}</div>
              <Link
                href="/mudur/koclar"
                className="text-xs text-[#1B6B8A] hover:underline mt-1 inline-block"
              >
                Koç listesi →
              </Link>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Atanmamış</p>
          )}
        </Card>

        <Card title="Hedef" icon={Target}>
          {student?.target_university || student?.target_department || student?.target_ranking ? (
            <div className="space-y-1 text-sm">
              {student?.target_university && (
                <div>
                  <span className="text-zinc-500">Üniversite: </span>
                  <span className="text-zinc-900">{student.target_university}</span>
                </div>
              )}
              {student?.target_department && (
                <div>
                  <span className="text-zinc-500">Bölüm: </span>
                  <span className="text-zinc-900">{student.target_department}</span>
                </div>
              )}
              {student?.target_ranking && (
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
          {student?.parent_name || student?.parent_phone ? (
            <div className="space-y-1 text-sm">
              {student?.parent_name && (
                <div className="text-zinc-900 font-medium">{student.parent_name}</div>
              )}
              {student?.parent_phone && <div className="text-zinc-500">{student.parent_phone}</div>}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Veli bilgisi yok</p>
          )}
        </Card>

        <Card title="Kayıt" icon={GraduationCap}>
          <p className="text-sm text-zinc-900">{formatDate(profile.created_at)}</p>
        </Card>
      </div>

      <Separator className="my-6" />

      <div className="bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl p-6 text-center">
        <p className="text-sm text-zinc-500">
          Konu ilerlemesi, deneme sonuçları ve soru istatistikleri koç panelinde gösterilecek.
        </p>
      </div>
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
