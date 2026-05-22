import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/blocks/admin/sidebar"
import { Topbar } from "@/blocks/admin/topbar"
import { Toaster } from "@/components/ui/sonner"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <>
        {children}
        <Toaster />
      </>
    )
  }

  const { data: coach } = await supabase.from("coaches").select("full_name").eq("id", user.id).maybeSingle()

  if (!coach) {
    // Trigger henüz çalışmamış olabilir, fallback
    await supabase.from("coaches").upsert({
      id: user.id,
      full_name: (user.user_metadata?.full_name as string) || user.email || "Koç",
    })
    redirect("/admin")
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex">
      <Sidebar coachName={coach.full_name} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar coachName={coach.full_name} />
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
      <Toaster />
    </div>
  )
}
