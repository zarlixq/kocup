import { getUiPreference } from "@/lib/analytics/ui-preferences-actions"
import { mergeOnboardingPrefs, type TourRole } from "@/lib/onboarding/tours"
import { createClient } from "@/lib/supabase/server"
import { istanbulDateStr } from "@/lib/tz"
import { isTrack, trackFor, type Track } from "@/lib/upplan/track"
import { ProductTour } from "@/components/onboarding/product-tour"

/** Panel layout'larında: kayıtlı tur durumu + (öğrencide) track ile turu bağlar. */
export async function TourMount({ role, userId }: { role: TourRole; userId: string }) {
  const prefs = mergeOnboardingPrefs(await getUiPreference("onboarding"))
  let track: Track | null = null
  if (role === "student") {
    const supabase = await createClient()
    const { data } = await supabase.from("student_upplan_profile").select("graduation_year, track").eq("student_id", userId).maybeSingle()
    track = trackFor(data?.graduation_year ?? null, istanbulDateStr()) ?? (isTrack(data?.track) ? data.track : null)
  }
  return <ProductTour role={role} track={track} initial={prefs.tours[role]} />
}
