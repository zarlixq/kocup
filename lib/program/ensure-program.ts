import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

type Client = SupabaseClient<Database>

// O hafta için programı bul, yoksa oluştur; program id döndür.
// Koç (öğrencisi için) ve öğrenci (kendisi için) ortak kullanır — RLS
// weekly_programs_insert her iki dalı da kapsar (migration 201).
export async function ensureProgram(
  supabase: Client,
  studentId: string,
  weekStart: string,
  createdBy: string,
): Promise<{ id: string } | { error: string }> {
  const { data: existing } = await supabase
    .from("weekly_programs")
    .select("id")
    .eq("student_id", studentId)
    .eq("week_start", weekStart)
    .maybeSingle()
  if (existing) return { id: existing.id }

  const { data: created, error } = await supabase
    .from("weekly_programs")
    .insert({ student_id: studentId, week_start: weekStart, created_by: createdBy })
    .select("id")
    .single()
  if (error || !created) {
    // Yarış durumu: başka istek oluşturmuş olabilir (UNIQUE student+week), tekrar dene.
    const { data: retry } = await supabase
      .from("weekly_programs")
      .select("id")
      .eq("student_id", studentId)
      .eq("week_start", weekStart)
      .maybeSingle()
    if (retry) return { id: retry.id }
    console.error("Program oluşturma hatası:", error)
    return { error: "Program oluşturulamadı." }
  }
  return { id: created.id }
}

/** Konunun seçilen derse ait olduğunu doğrular (DB'de CHECK ile yazılamaz). */
export async function topicBelongsToSubject(
  supabase: Client,
  topicId: string | null,
  subjectId: string | null,
): Promise<boolean> {
  if (!topicId) return true
  if (!subjectId) return false
  const { data } = await supabase.from("topics").select("subject_id").eq("id", topicId).maybeSingle()
  return data?.subject_id === subjectId
}
