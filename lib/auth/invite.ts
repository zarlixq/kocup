"use server"

import { supabaseAdmin } from "@/lib/supabase/admin"

type InviteStudentParams = {
  email: string
  full_name: string
  phone?: string | null
  grade?: string | null
  target_university?: string | null
  target_department?: string | null
  target_ranking?: number | null
  parent_name?: string | null
  parent_phone?: string | null
}

export async function inviteStudent(params: InviteStudentParams) {
  const admin = supabaseAdmin()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

  const { data, error } = await admin.auth.admin.inviteUserByEmail(params.email, {
    redirectTo: `${siteUrl}/auth/callback`,
    data: {
      role: "student",
      full_name: params.full_name,
      phone: params.phone ?? undefined,
    },
  })

  if (error) throw error

  return data.user
}

type InviteCoachParams = {
  email: string
  full_name: string
  phone?: string | null
}

export async function inviteCoach(params: InviteCoachParams) {
  const admin = supabaseAdmin()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

  const { data, error } = await admin.auth.admin.inviteUserByEmail(params.email, {
    redirectTo: `${siteUrl}/auth/callback`,
    data: {
      role: "coach",
      full_name: params.full_name,
      phone: params.phone ?? undefined,
    },
  })

  if (error) throw error

  return data.user
}
