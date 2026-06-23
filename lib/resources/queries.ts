import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import type {
  CatalogItem,
  StudentResourceItem,
  SubjectOption,
} from "@/components/kaynaklar/student-resources-manager"

type Client = SupabaseClient<Database>

/**
 * Bir öğrencinin kaynak yönetim ekranı için gereken tüm veriyi yükler
 * (atanmış kaynaklar + çözülen soru sayıları + katalog + dersler).
 * Çağıran request-scoped client RLS'i uygular.
 */
export async function loadStudentResourcesView(
  supabase: Client,
  studentId: string,
): Promise<{
  items: StudentResourceItem[]
  catalog: CatalogItem[]
  subjects: SubjectOption[]
}> {
  const [{ data: srRows }, { data: sessions }, { data: catRows }, { data: subjects }] =
    await Promise.all([
      supabase
        .from("student_resources")
        .select(
          "id, resource_id, status, added_by, resources(name, publisher, type, total_questions, subjects(name))",
        )
        .eq("student_id", studentId)
        .order("created_at", { ascending: false }),
      supabase
        .from("study_sessions")
        .select("resource_id, total_questions")
        .eq("student_id", studentId)
        .not("resource_id", "is", null),
      supabase
        .from("resources")
        .select("id, name, publisher, type, subjects(name)")
        .order("name"),
      supabase.from("subjects").select("id, name").order("name"),
    ])

  const solvedByResource = new Map<string, number>()
  for (const s of sessions ?? []) {
    if (!s.resource_id) continue
    solvedByResource.set(
      s.resource_id,
      (solvedByResource.get(s.resource_id) ?? 0) + (s.total_questions ?? 0),
    )
  }

  const items: StudentResourceItem[] = (srRows ?? []).map((r) => ({
    id: r.id,
    resource_id: r.resource_id,
    name: r.resources?.name ?? "—",
    publisher: r.resources?.publisher ?? null,
    subject_name: r.resources?.subjects?.name ?? null,
    type: r.resources?.type ?? "soru_bankasi",
    total_questions: r.resources?.total_questions ?? null,
    status: r.status,
    added_by: r.added_by,
    solved: solvedByResource.get(r.resource_id) ?? 0,
  }))

  const catalog: CatalogItem[] = (catRows ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    publisher: c.publisher ?? null,
    subject_name: c.subjects?.name ?? null,
    type: c.type,
  }))

  return { items, catalog, subjects: subjects ?? [] }
}
