"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

const VALID_STATUSES = ["basla", "devam", "tamam", "tekrar"] as const
type Status = (typeof VALID_STATUSES)[number]

export async function updateTopicStatusAction(topicId: string, status: string) {
  if (!VALID_STATUSES.includes(status as Status)) {
    return { error: "Geçersiz statü." }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Oturum bulunamadı." }

  const { error } = await supabase
    .from("student_topics")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", topicId)
    .eq("student_id", user.id)

  if (error) return { error: error.message }

  revalidatePath("/ogrenci/konularim")
  revalidatePath("/ogrenci")
  return { ok: true }
}
