import { notFound } from "next/navigation"
import { Phone, School as SchoolIcon, User2, Mail, Target } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

export default async function StudentOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: student }, { data: profile }] = await Promise.all([
    supabase.from("students").select("*").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("full_name, email, phone").eq("id", id).maybeSingle(),
  ])

  if (!student || !profile) notFound()

  return (
    <div className="space-y-6">
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
        <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={profile.email} />
        <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefon" value={profile.phone} />
        <InfoRow icon={<SchoolIcon className="h-4 w-4" />} label="Okul" value={student.school} />
        <InfoRow icon={<User2 className="h-4 w-4" />} label="Sınıf" value={student.grade ? `${student.grade}. Sınıf` : null} />
        <InfoRow icon={<User2 className="h-4 w-4" />} label="Veli" value={student.parent_name} />
        <InfoRow icon={<Phone className="h-4 w-4" />} label="Veli Telefonu" value={student.parent_phone} />
        {(student.target_university || student.target_department || student.target_ranking) && (
          <div className="md:col-span-3 pt-3 border-t border-zinc-100">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-2">
              <Target className="h-4 w-4" /> Hedef
            </div>
            <div className="text-sm text-zinc-700 space-x-3">
              {student.target_university && <span>{student.target_university}</span>}
              {student.target_department && <span className="text-zinc-500">/ {student.target_department}</span>}
              {student.target_ranking && (
                <span className="text-zinc-500">/ Sıralama: {student.target_ranking.toLocaleString("tr-TR")}</span>
              )}
            </div>
          </div>
        )}
        {student.notes && (
          <div className="md:col-span-3 pt-3 border-t border-zinc-100">
            <div className="text-xs text-zinc-500 mb-1">Notlar</div>
            <div className="text-sm text-zinc-700 whitespace-pre-line">{student.notes}</div>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-zinc-500">{label}</div>
        <div className="text-sm font-medium text-zinc-900 truncate">{value || "-"}</div>
      </div>
    </div>
  )
}
