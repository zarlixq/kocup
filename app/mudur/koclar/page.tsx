import { createClient } from "@/lib/supabase/server"
import { CoachesView, type CoachRow } from "@/components/mudur/coaches-view"

export const metadata = { title: "Koçlar — KoçUp" }

export default async function KoclarPage() {
  const supabase = await createClient()

  const { data: coachProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, created_at")
    .eq("role", "coach")
    .order("created_at", { ascending: false })

  const coachIds = (coachProfiles ?? []).map((c) => c.id)

  const { data: studentRows } = coachIds.length
    ? await supabase.from("students").select("id, coach_id, grade").in("coach_id", coachIds)
    : { data: [] as { id: string; coach_id: string | null; grade: string | null }[] }

  const studentIds = (studentRows ?? []).map((s) => s.id)
  const { data: studentProfiles } = studentIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", studentIds)
    : { data: [] as { id: string; full_name: string }[] }

  const studentNameById: Record<string, string> = {}
  for (const sp of studentProfiles ?? []) studentNameById[sp.id] = sp.full_name

  const byCoach: Record<string, { id: string; full_name: string; grade: string | null }[]> = {}
  for (const s of studentRows ?? []) {
    if (!s.coach_id) continue
    if (!byCoach[s.coach_id]) byCoach[s.coach_id] = []
    byCoach[s.coach_id].push({
      id: s.id,
      full_name: studentNameById[s.id] ?? "—",
      grade: s.grade,
    })
  }

  const coaches: CoachRow[] = (coachProfiles ?? []).map((c) => ({
    id: c.id,
    full_name: c.full_name,
    email: c.email,
    phone: c.phone,
    created_at: c.created_at,
    student_count: byCoach[c.id]?.length ?? 0,
    students: byCoach[c.id] ?? [],
  }))

  return (
    <div className="max-w-6xl mx-auto">
      <CoachesView coaches={coaches} />
    </div>
  )
}
