import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Toaster } from "@/components/ui/sonner"
import { Sidebar } from "@/components/mudur/sidebar"
import { getCurrentProfile } from "@/lib/auth/current-user"

export default async function MudurLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "admin") redirect("/giris/mudur")

  const supabase = await createClient()
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
        <div className="p-6 md:p-8 animate-in fade-in duration-300 motion-reduce:animate-none">
          {children}
        </div>
      </main>
      <Toaster />
    </div>
  )
}
