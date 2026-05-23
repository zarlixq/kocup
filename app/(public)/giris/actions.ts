"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const LoginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
})

type LoginResult = { success: false; error: string }

async function loginWithRole(
  formData: FormData,
  expectedRole: "student" | "coach" | "admin",
  redirectTo: string
): Promise<LoginResult> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
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
