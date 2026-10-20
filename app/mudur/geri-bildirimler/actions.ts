"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const statusSchema = z.enum(["yeni", "incelendi", "kapandi"])

/** Geri bildirim durumunu günceller (RLS: yalnız müdür). */
export async function updateFeedbackStatus(id: string, status: string): Promise<{ success: boolean; error?: string }> {
  const parsed = statusSchema.safeParse(status)
  if (!parsed.success || !z.string().uuid().safeParse(id).success) return { success: false, error: "Geçersiz istek." }

  const supabase = await createClient()
  const { data, error } = await supabase.from("feedback").update({ status: parsed.data }).eq("id", id).select("id")
  if (error || !data?.length) {
    if (error) console.error("updateFeedbackStatus:", error)
    return { success: false, error: "Güncellenemedi." }
  }
  revalidatePath("/mudur/geri-bildirimler")
  return { success: true }
}
