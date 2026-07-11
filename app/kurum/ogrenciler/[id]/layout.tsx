import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Mail, Phone } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { UserStatusBadge } from "@/components/shared/user-status-badge"
import { getUserStatus } from "@/lib/user-status"
import { getCurrentProfile } from "@/lib/auth/current-user"

function initials(name: string) {
  return name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()
}

export default async function KurumStudentDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const me = await getCurrentProfile()
  const orgId = me!.organization_id!

  const supabase = await createClient()
  const [{ data: profile }, { data: student }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, role, organization_id, first_login_at")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("students").select("*").eq("id", id).maybeSingle(),
  ])

  // Defense in depth: RLS zaten kısıtlar, ama org dışı öğrenciyi açıkça reddet.
  if (!profile || profile.role !== "student" || !student || student.organization_id !== orgId) {
    notFound()
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link
        href="/kurum/ogrenciler"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Öğrenciler listesi
      </Link>

      <div className="bg-white border border-zinc-200 rounded-2xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-[#1B6B8A] text-white text-lg">
                {initials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">{profile.full_name}</h1>
              <div className="flex items-center gap-3 text-sm text-zinc-500 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> {profile.email}
                </span>
                {profile.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> {profile.phone}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {student.grade && (
                  <Badge variant="outline">
                    {student.grade === "Mezun" ? "Mezun" : `${student.grade}. Sınıf`}
                  </Badge>
                )}
                <UserStatusBadge
                  status={getUserStatus({
                    first_login_at: profile.first_login_at,
                    is_active: student.is_active ?? true,
                  })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>{children}</div>
    </div>
  )
}
