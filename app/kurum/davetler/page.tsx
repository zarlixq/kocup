import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth/current-user"
import { InvitationsView } from "@/components/invitations/invitations-view"
import { loadInvitationsPage } from "@/lib/invitations/load"

export const metadata = { title: "Davetler — KoçUp" }

export default async function KurumDavetlerPage() {
  const profile = await getCurrentProfile()
  if (!profile?.organization_id) redirect("/kurum")
  const supabase = await createClient()
  const data = await loadInvitationsPage(supabase, profile.organization_id)
  return (
    <div className="max-w-6xl mx-auto">
      <InvitationsView {...data} lockedOrgId={profile.organization_id} />
    </div>
  )
}
