import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Toaster } from "@/components/ui/sonner"
import { Sidebar } from "@/components/koc/sidebar"

export default async function KocLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/giris/koc")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile || profile.role !== "coach") redirect("/giris/koc")

  return (
    <div className="min-h-screen bg-zinc-50">
      <Sidebar user={{ full_name: profile.full_name, email: profile.email }} />
      <main className="md:pl-64">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
      <Toaster />
    </div>
  )
}
