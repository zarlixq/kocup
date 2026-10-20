import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { FeedbackListView, type FeedbackItem } from "@/components/mudur/feedback-list-view"

export const metadata = { title: "Geri Bildirimler — KoçUp" }

export default async function GeriBildirimlerPage() {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from("feedback")
    .select("id, user_id, message, page_path, screenshot_path, status, created_at")
    .order("created_at", { ascending: false })
    .limit(500)

  const userIds = Array.from(new Set((rows ?? []).map((r) => r.user_id)))
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] as { id: string; full_name: string; email: string }[] }
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]))

  // Ekran görüntüleri private bucket'ta → kısa ömürlü imzalı URL (yalnız sunucuda).
  const paths = (rows ?? []).map((r) => r.screenshot_path).filter((p): p is string => !!p)
  const { data: signed } = paths.length
    ? await supabaseAdmin().storage.from("feedback").createSignedUrls(paths, 60 * 60)
    : { data: [] }
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]))

  const items: FeedbackItem[] = (rows ?? []).map((r) => ({
    id: r.id,
    message: r.message,
    page_path: r.page_path,
    status: r.status as FeedbackItem["status"],
    created_at: r.created_at,
    screenshot_url: r.screenshot_path ? urlByPath.get(r.screenshot_path) ?? null : null,
    user_id: r.user_id,
    user_name: byId.get(r.user_id)?.full_name ?? "—",
    user_email: byId.get(r.user_id)?.email ?? "",
  }))

  return (
    <div className="max-w-5xl mx-auto">
      <FeedbackListView items={items} />
    </div>
  )
}
