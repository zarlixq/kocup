import { supabaseAdmin } from "@/lib/supabase/admin"

// "use server" DEĞİL: bu fonksiyon istemciden çağrılabilir bir server action
// olarak dışa açılmamalı (keyfi rol hibesi = yetki yükseltme).

type GrantRole = "student" | "coach" | "admin" | "org_admin"

/**
 * Tek kullanımlık rol hibesi (migration 218). handle_new_user trigger'ı rolü ve
 * kurumu YALNIZ bu hibeden alır; user_metadata.role istemci tarafından
 * değiştirilebildiği için güvenilmez. Hibe kimliği metadata.role_grant ile taşınır.
 */
export async function createRoleGrant(
  email: string,
  role: GrantRole,
  organizationId: string | null = null,
): Promise<string> {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from("auth_role_grants")
    .insert({ email: email.trim().toLowerCase(), role, organization_id: organizationId })
    .select("id")
    .single()
  if (error || !data) throw new Error("Rol hibesi oluşturulamadı.")
  return data.id
}
