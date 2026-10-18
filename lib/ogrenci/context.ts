import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

type Client = SupabaseClient<Database>

// Öğrenci paneli 3 durumda da çalışmalı: kurumlu + koçlu, kurumsuz + koçlu,
// kurumsuz + koçsuz (bağımsız). Koça bağlı UI parçaları bu bağlamla karar verir.
export type StudentContext = {
  coachId: string | null
  coachName: string | null
  coachEmail: string | null
  organizationId: string | null
  grade: string | null
}

export type StudentKind = "kurum" | "koclu" | "bagimsiz"

export function studentKind(ctx: StudentContext): StudentKind {
  if (ctx.organizationId) return "kurum"
  return ctx.coachId ? "koclu" : "bagimsiz"
}

export async function getStudentContext(supabase: Client, studentId: string): Promise<StudentContext> {
  const [{ data: student }, { data: profile }] = await Promise.all([
    supabase.from("students").select("coach_id, organization_id, grade").eq("id", studentId).maybeSingle(),
    supabase.from("profiles").select("organization_id").eq("id", studentId).maybeSingle(),
  ])

  const coachId = student?.coach_id ?? null
  const { data: coach } = coachId
    ? await supabase.from("profiles").select("full_name, email").eq("id", coachId).maybeSingle()
    : { data: null }

  return {
    coachId,
    coachName: coach?.full_name ?? null,
    coachEmail: coach?.email ?? null,
    organizationId: student?.organization_id ?? profile?.organization_id ?? null,
    grade: student?.grade ?? null,
  }
}

// Koçu olmayan öğrenciye gösterilecek açıklama (kurumlu → kurum atayacak).
export function noCoachMessage(ctx: StudentContext): { title: string; description: string } {
  if (ctx.organizationId) {
    return {
      title: "Kurumun henüz koç atamadı",
      description:
        "Koçun atandığında burada görünecek. Bu sırada programını, hedeflerini ve soru çözüm kayıtlarını kendin yönetebilirsin.",
    }
  }
  return {
    title: "Bağımsız çalışıyorsun",
    description:
      "Koçun olmadan da tüm araçlar senin: haftalık programını kur, konu hedefleri koy, soru çözümlerini kaydet.",
  }
}
