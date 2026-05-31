import Link from "next/link"
import { Mail, Phone, GraduationCap, Target, UserCog, Calendar, Hash, FileText, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ProfileReadonlyForm } from "@/components/ogrenci/profile-readonly-form"
import { formatDate } from "@/lib/format"

export const metadata = { title: "Profilim — KoçUp" }

function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export default async function OgrenciProfilimPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user!.id

  const [{ data: profile }, { data: student }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, phone, created_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("students")
      .select("grade, target_university, target_department, target_ranking, coach_id")
      .eq("id", userId)
      .maybeSingle(),
  ])

  const { data: coach } = student?.coach_id
    ? await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", student.coach_id)
        .maybeSingle()
    : { data: null }

  // Mini istatistikler
  const [
    { data: questions },
    { count: examCount },
    { data: topics },
  ] = await Promise.all([
    supabase
      .from("study_sessions")
      .select("total_questions")
      .eq("student_id", userId),
    supabase
      .from("exams")
      .select("*", { count: "exact", head: true })
      .eq("student_id", userId),
    supabase.from("student_topics").select("status").eq("student_id", userId),
  ])

  const totalQuestions = (questions ?? []).reduce(
    (s, r) => s + (r.total_questions ?? 0),
    0,
  )
  const completedTopics = (topics ?? []).filter((t) => t.status === "tamam").length

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Profilim</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Bilgilerin ve hedefin. Telefon dışındaki alanlar için koçuna başvur.
        </p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-6 flex flex-col sm:flex-row items-start gap-5">
        <Avatar className="h-20 w-20">
          <AvatarFallback className="bg-[#1B6B8A] text-white text-xl">
            {initials(profile?.full_name ?? "?")}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1.5 min-w-0">
          <h2 className="text-lg font-bold text-zinc-900">{profile?.full_name ?? "—"}</h2>
          <div className="text-sm text-zinc-600 inline-flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-zinc-400" /> {profile?.email}
          </div>
          {profile?.phone && (
            <div className="text-sm text-zinc-600 inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-zinc-400" /> {profile.phone}
            </div>
          )}
          {student?.grade && (
            <div className="pt-1">
              <Badge variant="outline">
                <GraduationCap className="h-3 w-3 mr-1" />
                {student.grade === "Mezun" ? "Mezun" : `${student.grade}. Sınıf`}
              </Badge>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoCard
          icon={<UserCog className="h-4 w-4" />}
          label="Koçun"
          value={coach?.full_name ?? "Henüz atanmadı"}
        />
        <InfoCard
          icon={<Calendar className="h-4 w-4" />}
          label="Kayıt tarihi"
          value={profile?.created_at ? formatDate(profile.created_at) : "—"}
        />
        {(student?.target_university || student?.target_department) && (
          <InfoCard
            icon={<Target className="h-4 w-4" />}
            label="Hedef bölüm"
            value={[student?.target_university, student?.target_department].filter(Boolean).join(" / ")}
          />
        )}
        {student?.target_ranking && (
          <InfoCard
            icon={<Target className="h-4 w-4" />}
            label="Hedef sıralama"
            value={student.target_ranking.toLocaleString("tr-TR")}
          />
        )}
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-zinc-900 mb-4">İletişim Bilgisi</h2>
        <ProfileReadonlyForm
          fullName={profile?.full_name ?? ""}
          email={profile?.email ?? user?.email ?? ""}
          phone={profile?.phone ?? ""}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat icon={<Hash className="h-4 w-4" />} label="Toplam Soru" value={totalQuestions.toLocaleString("tr-TR")} tone="blue" />
        <Stat icon={<FileText className="h-4 w-4" />} label="Deneme" value={String(examCount ?? 0)} tone="orange" />
        <Stat icon={<CheckCircle2 className="h-4 w-4" />} label="Tamamlanan Konu" value={String(completedTopics)} tone="green" />
      </div>

      <div className="text-sm text-zinc-500">
        Şifre değiştirmek veya bildirim tercihlerini düzenlemek için{" "}
        <Link href="/ogrenci/ayarlar" className="text-[#1B6B8A] font-medium hover:underline">
          Ayarlar
        </Link>{" "}
        sayfasına git.
      </div>
    </div>
  )
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-500 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-zinc-500">{label}</div>
        <div className="text-sm font-medium text-zinc-900 truncate">{value}</div>
      </div>
    </div>
  )
}

const TONES: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700",
  orange: "bg-orange-50 text-[#F97316]",
  green: "bg-green-50 text-green-700",
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: keyof typeof TONES
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-zinc-500">{label}</span>
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${TONES[tone]}`}>
          {icon}
        </span>
      </div>
      <div className="text-lg font-bold text-zinc-900 tabular-nums">{value}</div>
    </div>
  )
}
