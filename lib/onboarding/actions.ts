"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getUiPreference, saveUiPreference } from "@/lib/analytics/ui-preferences-actions"
import { mergeOnboardingPrefs, TOUR_ROLES, TOUR_VERSION } from "@/lib/onboarding/tours"

type ActionResult = { success: boolean; error?: string }

const tourSchema = z.object({
  role: z.enum(TOUR_ROLES),
  status: z.enum(["yeni", "devam", "atlandi", "bitti"]),
  step: z.number().int().min(0).max(50),
})

/** Tur durumu (user_ui_preferences scope='onboarding'); yarıda kalan tur kaldığı adımdan sürer. */
export async function saveTourState(input: unknown): Promise<ActionResult> {
  try {
    const parsed = tourSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: "Geçersiz tur durumu." }
    const prefs = mergeOnboardingPrefs(await getUiPreference("onboarding"))
    prefs.tours[parsed.data.role] = { status: parsed.data.status, step: parsed.data.step, version: TOUR_VERSION }
    return await saveUiPreference("onboarding", prefs)
  } catch (e) {
    console.error("saveTourState", e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}

/** Kurulum listesi: "Konularım'ı gözden geçir" adımı (sayfa ilk açıldığında). */
export async function markKonularimVisited(): Promise<ActionResult> {
  try {
    const prefs = mergeOnboardingPrefs(await getUiPreference("onboarding"))
    if (prefs.visitedKonularim) return { success: true }
    prefs.visitedKonularim = true
    const res = await saveUiPreference("onboarding", prefs)
    revalidatePath("/ogrenci")
    return res
  } catch (e) {
    console.error("markKonularimVisited", e)
    return { success: false, error: "Bir hata oluştu, tekrar deneyin." }
  }
}
