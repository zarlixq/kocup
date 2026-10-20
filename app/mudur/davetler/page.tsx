import { createClient } from "@/lib/supabase/server"
import { InvitationsView } from "@/components/invitations/invitations-view"
import { loadInvitationsPage } from "@/lib/invitations/load"

export const metadata = { title: "Davetler — KoçUp" }

export default async function MudurDavetlerPage() {
  const supabase = await createClient()
  const data = await loadInvitationsPage(supabase, null)
  return (
    <div className="max-w-6xl mx-auto">
      <InvitationsView {...data} />
    </div>
  )
}
