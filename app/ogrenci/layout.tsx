import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Toaster } from "@/components/ui/sonner"

export default async function OgrenciLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/giris/ogrenci")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile || profile.role !== "student") redirect("/giris/ogrenci")

  return (
    <div className="min-h-screen bg-zinc-50">
      {children}
      <Toaster />
    </div>
  )
}
