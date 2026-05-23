import { createClient } from "@/lib/supabase/server"
import Link from "next/link"

export const metadata = { title: "Müdür Paneli — KoçUp" }

export default async function MudurDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .maybeSingle()

  const { count: pendingCount } = await supabase
    .from("applications")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending")

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 mb-1">
        Merhaba, {profile?.full_name}
      </h1>
      <p className="text-zinc-500 mb-8">Yönetim paneline hoş geldiniz.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/mudur/basvurular"
          className="bg-white border border-zinc-200 rounded-2xl p-6 hover:border-[#1B6B8A] transition-colors"
        >
          <div className="text-3xl font-bold text-[#1B6B8A] tabular-nums">
            {pendingCount ?? 0}
          </div>
          <div className="text-sm font-medium text-zinc-700 mt-1">Bekleyen Başvuru</div>
          <div className="text-xs text-zinc-400 mt-0.5">Başvuruları görüntüle →</div>
        </Link>
      </div>
    </div>
  )
}
