"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { istanbulDateStr, istanbulWeekStartStr } from "@/lib/tz"
import { addDays } from "@/lib/soru-cozum/summary"
import { todayDayOfWeek } from "@/lib/days"
import { ensureProgram } from "@/lib/program/ensure-program"
import { ERROR_TYPES } from "@/lib/yanlis-defteri/constants"
import {
  loadAtomCatalog,
  loadSessionWrongContext,
  type AtomCatalog,
  type SessionWrongContext,
} from "@/lib/yanlis-defteri/load"

type ActionResult<T = undefined> = { success: boolean; error?: string; data?: T }

// Açık haritası önerisi varsayılanları (tek tıkla eklenen hedef / blok).
const GAP_GOAL_DAYS = 14
const GAP_GOAL_QUESTIONS = 30
const GAP_BLOCK_QUESTIONS = 20

async function requireStudent() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Oturum bulunamadı." }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (profile?.role !== "student") return { ok: false as const, error: "Yetkisiz işlem." }
  return { ok: true as const, supabase, userId: user.id }
}

function revalidateWrongs(studentId: string) {
  revalidatePath("/ogrenci/yanlis-defteri")
  revalidatePath("/ogrenci/soru-cozum")
  revalidatePath(`/koc/ogrenciler/${studentId}/acik-haritasi`)
  revalidatePath(`/kurum/ogrenciler/${studentId}`)
}

// DB'nin Türkçe iş kuralı mesajları (23514/23503 ve RPC raise) kullanıcıya gösterilir.
function dbMessage(error: { code?: string; message: string }, fallback: string) {
  if (error.code === "23514" || error.code === "23503" || error.code === "P0001") return error.message
  return fallback
}

export async function getSessionWrongContext(sessionId: string): Promise<ActionResult<SessionWrongContext>> {
  const auth = await requireStudent()
  if (!auth.ok) return { success: false, error: auth.error }
  const ctx = await loadSessionWrongContext(auth.supabase, auth.userId, sessionId)
  if (!ctx) return { success: false, error: "Soru kaydı bulunamadı." }
  return { success: true, data: ctx }
}

// Atom seçici (AtomPicker) ders grubunun kataloğunu bir kez ister; arama istemcide.
export async function getAtomCatalog(subjectId: string): Promise<ActionResult<AtomCatalog>> {
  if (!z.string().uuid().safeParse(subjectId).success) return { success: false, error: "Geçersiz ders." }
  const auth = await requireStudent()
  if (!auth.ok) return { success: false, error: auth.error }
  return { success: true, data: await loadAtomCatalog(auth.supabase, auth.userId, subjectId) }
}

const itemsSchema = z
  .array(
    z.object({
      error_type: z.enum(ERROR_TYPES),
      knowledge_atom_id: z.string().uuid().nullable(),
      count: z.number().int().min(0).max(1000),
    }),
  )
  .max(100)

export async function saveSessionWrongs(
  sessionId: string,
  items: unknown,
  topicId?: string | null,
): Promise<ActionResult> {
  try {
    const parsed = itemsSchema.safeParse(items)
    if (!parsed.success) return { success: false, error: "Geçersiz yanlış listesi." }
    if (topicId != null && !z.string().uuid().safeParse(topicId).success) {
      return { success: false, error: "Geçersiz konu." }
    }

    const auth = await requireStudent()
    if (!auth.ok) return { success: false, error: auth.error }

    // Uzlaştırma tek transaction'da (migration 203); notlar korunur.
    const { error } = await auth.supabase.rpc("set_session_wrong_answers", {
      p_session_id: sessionId,
      p_items: parsed.data,
      p_topic_id: topicId ?? undefined,
    })
    if (error) {
      console.error("saveSessionWrongs", error)
      return { success: false, error: dbMessage(error, "Yanlışlar kaydedilemedi, tekrar dene.") }
    }

    revalidateWrongs(auth.userId)
    return { success: true }
  } catch (e) {
    console.error("saveSessionWrongs", e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}

const updateSchema = z.object({
  // null yalnız deneme yanlışında geçerli (DB CHECK, migration 208).
  error_type: z.enum(ERROR_TYPES).nullable(),
  knowledge_atom_id: z.string().uuid().nullable(),
  note: z
    .string()
    .trim()
    .max(1000, "Not en fazla 1000 karakter olabilir.")
    .nullable()
    .transform((v) => (v ? v : null)),
})

export async function updateWrongAnswer(id: string, input: unknown): Promise<ActionResult> {
  try {
    const parsed = updateSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." }

    const auth = await requireStudent()
    if (!auth.ok) return { success: false, error: auth.error }

    const { data, error } = await auth.supabase
      .from("wrong_answers")
      .update(parsed.data)
      .eq("id", id)
      .eq("student_id", auth.userId)
      .select("id")
    if (error) {
      console.error("updateWrongAnswer", error)
      return { success: false, error: dbMessage(error, "Güncellenemedi, tekrar dene.") }
    }
    if (!data || data.length === 0) return { success: false, error: "Kayıt bulunamadı." }

    revalidateWrongs(auth.userId)
    return { success: true }
  } catch (e) {
    console.error("updateWrongAnswer", e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}

export async function deleteWrongAnswer(id: string): Promise<ActionResult> {
  try {
    const auth = await requireStudent()
    if (!auth.ok) return { success: false, error: auth.error }

    const { data, error } = await auth.supabase
      .from("wrong_answers")
      .delete()
      .eq("id", id)
      .eq("student_id", auth.userId)
      .select("id")
    if (error) {
      console.error("deleteWrongAnswer", error)
      return { success: false, error: "Silinemedi, tekrar dene." }
    }
    if (!data || data.length === 0) return { success: false, error: "Kayıt bulunamadı." }

    revalidateWrongs(auth.userId)
    return { success: true }
  } catch (e) {
    console.error("deleteWrongAnswer", e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Açıktan tek tıkla hedef / program bloğu (created_by_role = 'ai')
// ─────────────────────────────────────────────────────────────────────────
// 'ai' satırını istemci yazamaz (set_created_by_role trigger'ı, 201). Burada:
//   1) çağıranın öğrenci olduğu ve atomun var olduğu oturum client'ıyla doğrulanır,
//   2) yazma TEK yerde service role ile yapılır; student_id daima çağıranın id'si.
// Öğrenci bu kayıtları kendi kaydı gibi düzenler/siler (migration 204).

async function loadAtomForGap(supabase: Awaited<ReturnType<typeof createClient>>, atomId: string) {
  if (!z.string().uuid().safeParse(atomId).success) return null
  const { data } = await supabase
    .from("knowledge_atoms")
    .select("id, name, topic_id, topics(name, subject_id)")
    .eq("id", atomId)
    .maybeSingle()
  return data
}

function revalidateGapTargets(studentId: string) {
  revalidatePath("/ogrenci/yanlis-defteri")
  revalidatePath("/ogrenci/konularim")
  revalidatePath("/ogrenci/program")
  revalidatePath("/ogrenci")
  revalidatePath(`/koc/ogrenciler/${studentId}/konu-analizi`)
  revalidatePath(`/koc/ogrenciler/${studentId}/program`)
}

export async function addGapGoal(atomId: string): Promise<ActionResult> {
  try {
    const auth = await requireStudent()
    if (!auth.ok) return { success: false, error: auth.error }
    const atom = await loadAtomForGap(auth.supabase, atomId)
    if (!atom) return { success: false, error: "Bilgi atomu bulunamadı." }

    const { data: existing } = await auth.supabase
      .from("topic_assignments")
      .select("id")
      .eq("student_id", auth.userId)
      .eq("topic_id", atom.topic_id)
      .eq("status", "aktif")
      .limit(1)
    if (existing && existing.length > 0) {
      return { success: false, error: "Bu konu için zaten aktif bir hedefin var (Konularım)." }
    }

    const today = istanbulDateStr()
    const { error } = await supabaseAdmin().from("topic_assignments").insert({
      student_id: auth.userId,
      coach_id: null,
      topic_id: atom.topic_id,
      hedef_soru: GAP_GOAL_QUESTIONS,
      baslangic_tarihi: today,
      son_tarih: addDays(today, GAP_GOAL_DAYS),
      notes: `Açık haritası önerisi: ${atom.name}`,
      created_by: auth.userId,
      created_by_role: "ai",
    })
    if (error) {
      console.error("addGapGoal", error)
      return { success: false, error: "Hedef eklenemedi, tekrar dene." }
    }

    revalidateGapTargets(auth.userId)
    return { success: true }
  } catch (e) {
    console.error("addGapGoal", e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}

export async function addGapReviewBlock(atomId: string): Promise<ActionResult<{ weekStart: string; day: number }>> {
  try {
    const auth = await requireStudent()
    if (!auth.ok) return { success: false, error: auth.error }
    const atom = await loadAtomForGap(auth.supabase, atomId)
    if (!atom) return { success: false, error: "Bilgi atomu bulunamadı." }

    // Yarın; bugün Pazar ise gelecek haftanın Pazartesi'si (Istanbul).
    const todayDow = todayDayOfWeek(new Date(`${istanbulDateStr()}T12:00:00`))
    const thisWeek = istanbulWeekStartStr()
    const weekStart = todayDow === 7 ? addDays(thisWeek, 7) : thisWeek
    const day = todayDow === 7 ? 1 : todayDow + 1
    const baslik = `Tekrar: ${atom.name}`.slice(0, 120)

    const admin = supabaseAdmin()
    const prog = await ensureProgram(admin, auth.userId, weekStart, auth.userId)
    if ("error" in prog) return { success: false, error: prog.error }

    const { data: dup } = await admin
      .from("weekly_program_items")
      .select("id")
      .eq("program_id", prog.id)
      .eq("baslik", baslik)
      .limit(1)
    if (dup && dup.length > 0) return { success: false, error: "Bu tekrar bloğu zaten programında." }

    const { error } = await admin.from("weekly_program_items").insert({
      program_id: prog.id,
      day_of_week: day,
      subject_id: atom.topics?.subject_id ?? null,
      topic_id: atom.topic_id,
      baslik,
      aciklama: "Açık haritası önerisi",
      hedef_soru: GAP_BLOCK_QUESTIONS,
      created_by_role: "ai",
    })
    if (error) {
      console.error("addGapReviewBlock", error)
      return { success: false, error: "Program bloğu eklenemedi, tekrar dene." }
    }

    revalidateGapTargets(auth.userId)
    return { success: true, data: { weekStart, day } }
  } catch (e) {
    console.error("addGapReviewBlock", e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}
