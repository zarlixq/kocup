import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth/current-user"
import { OrgSettingsForm } from "@/components/kurum/org-settings-form"

export const metadata = { title: "Ayarlar — Kurum" }

export default async function KurumAyarlarPage() {
  const profile = await getCurrentProfile()
  const orgId = profile!.organization_id!

  const supabase = await createClient()
  const { data: organization } = await supabase
    .from("organizations")
    .select(
      "id, name, slug, logo_url, primary_color, accent_color, plan, contact_email, contact_phone, address",
    )
    .eq("id", orgId)
    .maybeSingle()

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Ayarlar</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Kurum markası, iletişim ve plan bilgileri.
        </p>
      </div>

      {organization && <OrgSettingsForm organization={organization} />}
    </div>
  )
}
