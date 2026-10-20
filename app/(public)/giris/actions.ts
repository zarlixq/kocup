"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"
import { checkRateLimit, getClientIp, RATE_LIMIT_MESSAGE } from "@/lib/security/rate-limit"
import { TURNSTILE_ERROR, TURNSTILE_FIELD, verifyTurnstile } from "@/lib/security/turnstile"

const LoginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
})

type LoginResult = { success: false; error: string; unverifiedEmail?: string }

async function loginWithRole(
  formData: FormData,
  expectedRole: "student" | "coach" | "admin" | "org_admin",
  redirectTo: string
): Promise<LoginResult> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  // Kötüye kullanım koruması: IP ve e-posta bazlı sayaç + (varsa) Turnstile.
  const ip = await getClientIp()
  const [ipOk, emailOk] = await Promise.all([
    checkRateLimit("loginIp", ip),
    checkRateLimit("loginEmail", parsed.data.email),
  ])
  if (!ipOk || !emailOk) return { success: false, error: RATE_LIMIT_MESSAGE }
  if (!(await verifyTurnstile(formData.get(TURNSTILE_FIELD), ip))) {
    return { success: false, error: TURNSTILE_ERROR }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    if (error.code === "email_not_confirmed") {
      return {
        success: false,
        error: "E-posta adresin henüz doğrulanmadı. Gelen kutunu kontrol et.",
        unverifiedEmail: parsed.data.email,
      }
    }
    return { success: false, error: "E-posta veya şifre hatalı." }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", (await supabase.auth.getUser()).data.user!.id)
    .maybeSingle()

  if (!profile || profile.role !== expectedRole) {
    await supabase.auth.signOut()
    return { success: false, error: "Bu hesap bu panele erişim yetkisine sahip değil." }
  }

  redirect(redirectTo)
}

export async function loginOgrenci(
  _prev: unknown,
  formData: FormData
): Promise<LoginResult> {
  return loginWithRole(formData, "student", "/ogrenci")
}

export async function loginKoc(
  _prev: unknown,
  formData: FormData
): Promise<LoginResult> {
  return loginWithRole(formData, "coach", "/koc")
}

export async function loginMudur(
  _prev: unknown,
  formData: FormData
): Promise<LoginResult> {
  return loginWithRole(formData, "admin", "/mudur")
}

export async function loginKurum(
  _prev: unknown,
  formData: FormData
): Promise<LoginResult> {
  return loginWithRole(formData, "org_admin", "/kurum")
}
