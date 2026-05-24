import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Toaster } from "@/components/ui/sonner"
import { Sidebar } from "@/components/mudur/sidebar"

export default async function MudurLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/giris/mudur")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile || profile.role !== "admin") redirect("/giris/mudur")

  const { count: pendingCount } = await supabase
    .from("applications")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending")

  return (
    <div className="min-h-screen bg-zinc-50">
      <Sidebar
        user={{ full_name: profile.full_name, email: profile.email }}
        pendingCount={pendingCount ?? 0}
      />
      <main className="md:pl-64">
        <div className="p-6 md:p-8">{children}</div>
      </main>
      <Toaster />
    </div>
  )
}
