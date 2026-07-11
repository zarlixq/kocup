import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Toaster } from "@/components/ui/sonner"
import { Sidebar } from "@/components/kurum/sidebar"
import { getCurrentProfile } from "@/lib/auth/current-user"

export default async function KurumLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "org_admin") redirect("/giris/kurum")
  if (!profile.organization_id) redirect("/giris/kurum")

  const supabase = await createClient()
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, logo_url, primary_color, accent_color")
    .eq("id", profile.organization_id)
    .maybeSingle()

  const cssVars: React.CSSProperties = {}
  if (organization?.primary_color) {
    ;(cssVars as Record<string, string>)["--brand-primary"] = organization.primary_color
  }
  if (organization?.accent_color) {
    ;(cssVars as Record<string, string>)["--brand-accent"] = organization.accent_color
  }

  return (
    <div className="min-h-screen bg-zinc-50" style={cssVars}>
      <Sidebar
        user={{ full_name: profile.full_name, email: profile.email }}
        organization={
          organization
            ? {
                name: organization.name,
                logo_url: organization.logo_url,
                primary_color: organization.primary_color,
              }
            : null
        }
      />
      <main className="md:pl-64">
        <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-300 motion-reduce:animate-none">
          {children}
        </div>
      </main>
      <Toaster />
    </div>
  )
}
