import { cache } from "react"
import { createClient } from "@/lib/supabase/server"

// Aynı request içinde tekrar tekrar Supabase'e gitmeden user + profile
// bilgisini almak için React 19 cache(). Layout + page + child component
// hepsi çağırsa bile DB'ye yalnızca bir kere gider.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

export const getCurrentProfile = cache(async () => {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email, phone, avatar_url, organization_id")
    .eq("id", user.id)
    .maybeSingle()

  return profile
})

export type CurrentProfile = NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>
