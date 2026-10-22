import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { Toaster } from "@/components/ui/sonner"
import { Sidebar } from "@/components/ogrenci/sidebar"
import { PomodoroProvider } from "@/components/pomodoro/pomodoro-provider"
import { FeedbackButton } from "@/components/ogrenci/feedback-button"
import { getCurrentProfile } from "@/lib/auth/current-user"
import { createClient } from "@/lib/supabase/server"
import { requireEmailVerification } from "@/lib/auth/verification"
import { VerifyEmailBanner } from "@/components/ogrenci/verify-email-banner"
import { VERIFY_BANNER_COOKIE } from "@/lib/auth/verify-banner"

export default async function OgrenciLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "student") redirect("/giris/ogrenci")

  // Bireysel öğrencinin e-posta doğrulaması (geliş kaydı yoksa konu dışı).
  const supabase = await createClient()
  const { data: acq } = await supabase
    .from("student_acquisition")
    .select("email_verified_at")
    .eq("student_id", profile.id)
    .maybeSingle()
  const unverified = !!acq && acq.email_verified_at === null
  if (unverified && requireEmailVerification()) redirect(`/ucretsiz/dogrula?email=${encodeURIComponent(profile.email)}`)
  const showBanner = unverified && (await cookies()).get(VERIFY_BANNER_COOKIE)?.value !== "gizli"

  return (
    <div className="min-h-screen bg-zinc-50">
      <Sidebar user={{ full_name: profile.full_name, email: profile.email }} hasOrganization={!!profile.organization_id} />
      <main className="md:pl-64">
        <div className="p-6 md:p-8 max-w-6xl mx-auto animate-in fade-in duration-300 motion-reduce:animate-none">
          {showBanner && <VerifyEmailBanner email={profile.email} />}
          {children}
        </div>
      </main>
      <PomodoroProvider />
      <FeedbackButton />
      <Toaster />
    </div>
  )
}
