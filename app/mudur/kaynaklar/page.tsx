import { createClient } from "@/lib/supabase/server"
import { ResourcesView, type ResourceRow } from "@/components/mudur/resources-view"

export const metadata = { title: "Kaynaklar — Müdür" }

export default async function MudurKaynaklarPage() {
  const supabase = await createClient()

  const [{ data: resources }, { data: subjects }] = await Promise.all([
    supabase
      .from("resources")
      .select("id, name, publisher, type, total_questions, subject_id, is_custom, subjects(name)")
      .order("name"),
    supabase.from("subjects").select("id, name").order("name"),
  ])

  const rows: ResourceRow[] = (resources ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    publisher: r.publisher ?? null,
    subject_id: r.subject_id ?? null,
    subject_name: r.subjects?.name ?? null,
    type: r.type,
    total_questions: r.total_questions ?? null,
    is_custom: r.is_custom,
  }))

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900">Kaynak Kataloğu</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Kitap ve yayınları yönet. Koç/öğrencilerin serbest eklediği kaynaklar burada
          &ldquo;özel&rdquo; olarak görünür.
        </p>
      </header>

      <ResourcesView rows={rows} subjects={subjects ?? []} />
    </div>
  )
}
