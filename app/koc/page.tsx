import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Dashboard — KoçUp" }

export default async function KocDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .maybeSingle()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-zinc-900">
        Merhaba, {profile?.full_name} 👋
      </h1>
      <p className="text-zinc-500 mt-1">Koç panelinize hoş geldiniz.</p>
    </div>
  )
}
