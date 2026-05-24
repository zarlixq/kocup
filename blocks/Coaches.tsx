import { createClient } from "@/lib/supabase/server"
import { CoachesView, type LandingCoach } from "./CoachesView"

export default async function Coaches() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, bio, certificate_info, specialties, created_at")
    .eq("role", "coach")
    .not("certificate_info", "is", null)
    .order("created_at", { ascending: true })

  const coaches: LandingCoach[] = (data ?? []).map((c, i) => ({
    id: c.id,
    full_name: c.full_name,
    bio: c.bio,
    certificate_info: c.certificate_info,
    specialties: c.specialties ?? [],
    bgIndex: i % 4,
  }))

  return <CoachesView coaches={coaches} />
}
