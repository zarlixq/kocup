import Link from "next/link"
import { CheckCircle2, Circle, ListChecks } from "lucide-react"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { getUiPreference } from "@/lib/analytics/ui-preferences-actions"
import { mergeOnboardingPrefs } from "@/lib/onboarding/tours"
import { istanbulDateStr } from "@/lib/tz"
import { parseAvailability } from "@/lib/upplan/profile"
import { isTrack, trackFor, type Track } from "@/lib/upplan/track"
import { cn } from "@/lib/utils"

type Client = SupabaseClient<Database>

export type ChecklistStep = { key: string; label: string; href: string; done: boolean }

/** Track'e göre kurulum adımları (9-10: deneme yerine konu öz değerlendirmesi). */
export function checklistSteps(s: {
  track: Track | null
  profileSaved: boolean
  hasAvailability: boolean
  examCount: number
  assessmentCount: number
  visitedKonularim: boolean
  programApproved: boolean
}): ChecklistStep[] {
  const early = s.track === "maarif_9" || s.track === "maarif_10"
  return [
    { key: "sinif", label: "Sınıfını doğrula", href: "/ogrenci/upplan/kurulum?adim=profil", done: s.profileSaved && s.track !== null },
    { key: "musaitlik", label: "Haftalık müsaitliğini gir", href: "/ogrenci/upplan/kurulum?adim=profil", done: s.hasAvailability },
    early
      ? { key: "tarama", label: "Okulda işlediğin konuları değerlendir", href: "/ogrenci/upplan/kurulum?adim=tarama", done: s.assessmentCount > 0 }
      : { key: "deneme", label: "İlk denemeni ekle", href: "/ogrenci/denemelerim", done: s.examCount > 0 },
    { key: "konularim", label: "Konularım'ı gözden geçir", href: "/ogrenci/konularim", done: s.visitedKonularim },
    { key: "program", label: "İlk programını onayla", href: "/ogrenci/program", done: s.programApproved },
  ]
}

/** Öğrenci dashboard'unda kalıcı kurulum listesi; hepsi tamamlanınca görünmez. */
export async function SetupChecklist({ supabase, studentId }: { supabase: Client; studentId: string }) {
  const [{ data: profile }, { count: examCount }, { count: assessmentCount }, { count: approved }, prefsRaw] = await Promise.all([
    supabase.from("student_upplan_profile").select("graduation_year, track, availability, setup_step").eq("student_id", studentId).maybeSingle(),
    supabase.from("exams").select("id", { count: "exact", head: true }).eq("student_id", studentId),
    supabase.from("student_topic_self_assessment").select("topic_id", { count: "exact", head: true }).eq("student_id", studentId),
    supabase.from("upplan_program_drafts").select("week_start", { count: "exact", head: true }).eq("student_id", studentId).eq("status", "onaylandi"),
    getUiPreference("onboarding"),
  ])
  const track = trackFor(profile?.graduation_year ?? null, istanbulDateStr()) ?? (isTrack(profile?.track) ? profile.track : null)
  const steps = checklistSteps({
    track,
    profileSaved: !!profile && profile.setup_step !== "profil",
    hasAvailability: Object.keys(parseAvailability(profile?.availability)).length > 0,
    examCount: examCount ?? 0,
    assessmentCount: assessmentCount ?? 0,
    visitedKonularim: mergeOnboardingPrefs(prefsRaw).visitedKonularim,
    programApproved: (approved ?? 0) > 0,
  })
  const done = steps.filter((s) => s.done).length
  if (done === steps.length) return null
  const next = steps.find((s) => !s.done)
  return (
    <section data-tour="setup-checklist" className="rounded-2xl border border-[#1B6B8A]/25 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-[#1B6B8A]" />
          <h2 className="text-sm font-semibold text-zinc-900">Kurulum listesi</h2>
        </div>
        <span className="text-xs tabular-nums text-zinc-500">
          {done} / {steps.length}
        </span>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-zinc-100" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={steps.length} aria-label="Kurulum ilerlemesi">
        <div className="h-full rounded-full bg-[#F97316]" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ol className="space-y-1.5">
        {steps.map((s) => (
          <li key={s.key}>
            <Link
              href={s.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-zinc-50",
                s.done ? "text-zinc-400 line-through" : s === next ? "font-medium text-zinc-900" : "text-zinc-700",
              )}
            >
              {s.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <Circle className="h-4 w-4 shrink-0 text-zinc-300" />}
              {s.label}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
