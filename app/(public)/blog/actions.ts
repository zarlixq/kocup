"use server"

import { createClient } from "@/lib/supabase/server"

export async function incrementBlogView(slug: string) {
  if (!slug) return
  const supabase = await createClient()
  await supabase.rpc("increment_blog_post_view", { p_slug: slug })
}
