import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { effectiveStatus, expireStaleInvitations } from "@/lib/invitations/service"
import type { InvitationListRow } from "@/components/invitations/invitations-view"
import type { InviteCoachOption, InviteOption } from "@/components/invitations/invite-dialog"

type Client = SupabaseClient<Database>

/** Davet listesi + form seçenekleri. Okuma oturum client'ıyla (RLS kapsamı). */
export async function loadInvitationsPage(supabase: Client, orgId: string | null) {
  await expireStaleInvitations(supabaseAdmin())

  let invQ = supabase
    .from("student_invitations")
    .select(
      "id, full_name, email, segment, grade, status, expires_at, sent_at, send_count, organization_id, coach_id, invited_by",
    )
    .order("created_at", { ascending: false })
    .limit(1000)
  if (orgId) invQ = invQ.eq("organization_id", orgId)

  let orgQ = supabase.from("organizations").select("id, name").order("name")
  if (orgId) orgQ = orgQ.eq("id", orgId)

  let coachQ = supabase.from("profiles").select("id, full_name, organization_id").eq("role", "coach").order("full_name")
  if (orgId) coachQ = coachQ.eq("organization_id", orgId)

  const [{ data: invs }, { data: orgs }, { data: coachRows }] = await Promise.all([invQ, orgQ, coachQ])

  const inviterIds = Array.from(new Set((invs ?? []).map((i) => i.invited_by).filter((v): v is string => !!v)))
  const { data: inviters } = inviterIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", inviterIds)
    : { data: [] as { id: string; full_name: string }[] }

  const orgName = new Map((orgs ?? []).map((o) => [o.id, o.name]))
  const coachName = new Map((coachRows ?? []).map((c) => [c.id, c.full_name]))
  const inviterName = new Map((inviters ?? []).map((p) => [p.id, p.full_name]))

  const invitations: InvitationListRow[] = (invs ?? []).map((i) => ({
    id: i.id,
    full_name: i.full_name,
    email: i.email,
    segment: i.segment,
    grade: i.grade,
    organization_name: i.organization_id ? orgName.get(i.organization_id) ?? null : null,
    coach_name: i.coach_id ? coachName.get(i.coach_id) ?? null : null,
    status: effectiveStatus(i),
    expires_at: i.expires_at,
    sent_at: i.sent_at,
    send_count: i.send_count,
    invited_by_name: i.invited_by ? inviterName.get(i.invited_by) ?? null : null,
  }))

  const organizations: InviteOption[] = (orgs ?? []).map((o) => ({ id: o.id, name: o.name }))
  const coaches: InviteCoachOption[] = (coachRows ?? []).map((c) => ({
    id: c.id,
    name: c.full_name,
    organization_id: c.organization_id,
  }))

  return { invitations, organizations, coaches }
}
