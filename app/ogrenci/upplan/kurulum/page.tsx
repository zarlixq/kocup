import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/server"
import { istanbulDateStr } from "@/lib/tz"
import { DEFAULT_FOCUS } from "@/lib/upplan/config"
import { ALANLAR, defaultsFromGrade } from "@/lib/upplan/profile"
import { loadScanData, loadUpplanProfile } from "@/lib/upplan/load"
import { ProfileStep } from "@/components/upplan/setup/profile-step"
import { ScanStep } from "@/components/upplan/setup/scan-step"
import { ExamStep } from "@/components/upplan/setup/exam-step"

export const metadata = { title: "UpPlan Kurulumu — KoçUp" }

type Step = "profil" | "tarama" | "deneme"
const STEPS: { key: Step; label: string }[] = [
  { key: "profil", label: "Profil" },
  { key: "tarama", label: "Konu taraması" },
  { key: "deneme", label: "Deneme" },
]

export default async function UpplanSetupPage({ searchParams }: { searchParams: Promise<{ adim?: string }> }) {
  const sp = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const studentId = user!.id
  const profile = await loadUpplanProfile(supabase, studentId)
  const done = !!profile?.completed_at

  // Profil yoksa her adım profile döner; yoksa istenen adım ya da kalınan yer.
  const requested = STEPS.find((s) => s.key === sp.adim)?.key
  const resume: Step = profile && profile.setup_step !== "bitti" ? (profile.setup_step as Step) : "profil"
  const step: Step = !profile ? "profil" : (requested ?? resume)

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        {done && (
          <Link href="/ogrenci/upplan" className="mb-2 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="h-4 w-4" /> UpPlan
          </Link>
        )}
        <h1 className="text-2xl font-bold text-zinc-900">{done ? "UpPlan ayarları" : "Seviyeni belirleyelim"}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {done ? "Profilini ve konu taramanı istediğin zaman güncelleyebilirsin." : "3 kısa adım, yaklaşık 5 dakika. İstediğin yerde bırakıp sonra devam edebilirsin."}
        </p>
      </div>

      <nav aria-label="Kurulum adımları" className="grid grid-cols-3 gap-2">
        {STEPS.map((s, i) => {
          const active = s.key === step
          const reachable = !!profile
          const cls = cn(
            "rounded-xl border px-3 py-2 text-center text-xs font-medium sm:text-sm",
            active ? "border-[#1B6B8A] bg-[#1B6B8A] text-white" : "border-zinc-200 bg-white text-zinc-600",
            reachable && !active && "hover:border-zinc-400",
          )
          return reachable ? (
            <Link key={s.key} href={`/ogrenci/upplan/kurulum?adim=${s.key}`} className={cls} aria-current={active ? "step" : undefined}>
              {i + 1}. {s.label}
            </Link>
          ) : (
            <span key={s.key} className={cls} aria-current={active ? "step" : undefined}>
              {i + 1}. {s.label}
            </span>
          )
        })}
      </nav>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
        {step === "profil" && <ProfileStepLoader studentId={studentId} supabase={supabase} done={done} />}
        {step === "tarama" && profile && (
          <ScanStep
            data={await loadScanData(supabase, studentId, profile)}
            nextHref={done ? "/ogrenci/upplan" : "/ogrenci/upplan/kurulum?adim=deneme"}
            isSetup={!done}
          />
        )}
        {step === "deneme" && <ExamStepLoader studentId={studentId} supabase={supabase} />}
      </div>
    </div>
  )
}

type Supabase = Awaited<ReturnType<typeof createClient>>

async function ProfileStepLoader({ studentId, supabase, done }: { studentId: string; supabase: Supabase; done: boolean }) {
  const [profile, { data: student }, { data: acquisition }] = await Promise.all([
    loadUpplanProfile(supabase, studentId),
    supabase.from("students").select("grade, target_department, target_ranking").eq("id", studentId).maybeSingle(),
    // Ücretsiz kayıt/davette seçilen alan kurulumu ön doldurur.
    supabase.from("student_acquisition").select("alan").eq("student_id", studentId).maybeSingle(),
  ])
  const alan = ALANLAR.find((a) => a === acquisition?.alan) ?? null
  const fromGrade = defaultsFromGrade(student?.grade ?? null)
  return (
    <ProfileStep
      today={istanbulDateStr()}
      nextHref={done ? "/ogrenci/upplan" : "/ogrenci/upplan/kurulum?adim=tarama"}
      initial={
        profile ?? {
          ...fromGrade,
          alan,
          availability: {},
          focus_minutes: DEFAULT_FOCUS,
          target_department: student?.target_department ?? null,
          target_ranking: student?.target_ranking ?? null,
        }
      }
    />
  )
}

async function ExamStepLoader({ studentId, supabase }: { studentId: string; supabase: Supabase }) {
  const { data: latest } = await supabase
    .from("exams")
    .select("id, name, date")
    .eq("student_id", studentId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle()
  return <ExamStep latestExam={latest ?? null} />
}
