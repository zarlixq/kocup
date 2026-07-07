"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

type Result = { success: boolean; error?: string }

// Öğrenci kendi program kalemini yaptım/yapmadım işaretler.
// RLS öğrencinin yalnızca kendi kalemini güncellemesine izin verir; burada
// sadece is_completed + completed_at yazıyoruz.
export async function toggleProgramItemDone(
  itemId: string,
  isCompleted: boolean,
): Promise<Result> {
  if (!itemId) return { success: false, error: "Kalem bulunamadı." }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Oturum bulunamadı." }

  const { error } = await supabase
    .from("weekly_program_items")
    .update({
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
    })
    .eq("id", itemId)

  if (error) {
    console.error("Program kalemi işaretleme hatası:", error)
    return { success: false, error: "İşaretlenemedi, tekrar deneyin." }
  }

  revalidatePath("/ogrenci/program")
  return { success: true }
}
