"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { supersedeRoadmap } from "@/lib/upplan/supersede"

type ActionResult = { success: boolean; error?: string; data?: { status: string | null; cancelled: number } }

/** Debug: öğrencinin yol haritasını arşivleyip yeni algoritmayla yeniden üretir (yalnız müdür). */
export async function regenerateStudentRoadmap(studentId: unknown): Promise<ActionResult> {
  try {
    const parsed = z.string().uuid().safeParse(studentId)
    if (!parsed.success) return { success: false, error: "Geçersiz öğrenci." }
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Oturum bulunamadı." }
    const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    if (me?.role !== "admin") return { success: false, error: "Yetkisiz işlem." }
    const res = await supersedeRoadmap(supabaseAdmin(), parsed.data, `müdür debug: ${user.id}`)
    revalidatePath("/mudur/upplan")
    if (res.error && res.newStatus !== "superseded") return { success: false, error: res.error }
    return { success: true, data: { status: res.newStatus, cancelled: res.cancelledGoals } }
  } catch (e) {
    console.error("regenerateStudentRoadmap", e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}
