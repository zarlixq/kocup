import { redirect } from "next/navigation"
import { Toaster } from "@/components/ui/sonner"
import { Sidebar } from "@/components/koc/sidebar"
import { getCurrentProfile } from "@/lib/auth/current-user"

export default async function KocLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "coach") redirect("/giris/koc")

  return (
    <div className="min-h-screen bg-zinc-50">
      <Sidebar user={{ full_name: profile.full_name, email: profile.email }} />
      <main className="md:pl-64">
        <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-300 motion-reduce:animate-none">
          {children}
        </div>
      </main>
      <Toaster />
    </div>
  )
}
