import { createClient } from "@/lib/supabase/server"
import { StudentsView, type StudentRow } from "@/components/mudur/students-view"

export const metadata = { title: "Öğrenciler — KoçUp" }

export default async function OgrencilerPage() {
  const supabase = await createClient()

  const [{ data: studentProfiles }, { data: studentRows }, { data: coaches }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, created_at")
      .eq("role", "student")
      .order("created_at", { ascending: false }),
    supabase.from("students").select("id, coach_id, grade, target_department, parent_phone"),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "coach")
      .order("full_name"),
  ])

  const coachNameById: Record<string, string> = {}
  for (const c of coaches ?? []) coachNameById[c.id] = c.full_name

  const studentExtraById: Record<
    string,
    {
      coach_id: string | null
      grade: string | null
      target_department: string | null
      parent_phone: string | null
    }
  > = {}
  for (const s of studentRows ?? []) {
    studentExtraById[s.id] = {
      coach_id: s.coach_id,
      grade: s.grade,
      target_department: s.target_department,
      parent_phone: s.parent_phone,
    }
  }

  const students: StudentRow[] = (studentProfiles ?? []).map((p) => {
    const extra = studentExtraById[p.id] ?? {
      coach_id: null,
      grade: null,
      target_department: null,
      parent_phone: null,
    }
    return {
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      grade: extra.grade,
      coach_id: extra.coach_id,
      coach_name: extra.coach_id ? coachNameById[extra.coach_id] ?? null : null,
      target_department: extra.target_department,
      parent_phone: extra.parent_phone,
      created_at: p.created_at,
    }
  })

  return (
    <div className="max-w-6xl mx-auto">
      <StudentsView students={students} coaches={coaches ?? []} />
    </div>
  )
}
