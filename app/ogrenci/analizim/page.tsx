import { createClient } from "@/lib/supabase/server"
import { AnalizDashboard } from "@/components/analiz/analiz-dashboard"

export const metadata = { title: "Analizim — KoçUp" }

export default async function OgrenciAnalizimPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [sp, supabase] = await Promise.all([searchParams, createClient()])
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900">Analizim</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Soru çözümlerin, videoların, konuların, programın, denemelerin ve yanlış defterin tek yerde.
        </p>
      </header>

      <AnalizDashboard studentId={user!.id} mode="student" basePath="/ogrenci/analizim" searchParams={sp} />
    </div>
  )
}
