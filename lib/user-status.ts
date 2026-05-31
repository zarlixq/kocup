export type UserStatus = "pending" | "active" | "inactive"

type StatusInput = {
  first_login_at: string | null | undefined
  /** Sadece öğrenci için anlamlı; koç için her zaman true verilmeli. */
  is_active?: boolean | null
}

/**
 * Davet edilmiş ama hiç giriş yapmamış → "pending"
 * Giriş yapmış + aktif → "active"
 * Giriş yapmış + pasif → "inactive"
 */
export function getUserStatus({ first_login_at, is_active }: StatusInput): UserStatus {
  if (!first_login_at) return "pending"
  if (is_active === false) return "inactive"
  return "active"
}

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  pending: "Davet Beklemede",
  active: "Aktif",
  inactive: "Pasif",
}

export const USER_STATUS_TOOLTIP: Record<UserStatus, string> = {
  pending: "Kullanıcı henüz ilk girişini yapmadı.",
  active: "Kullanıcı sisteme aktif olarak erişebiliyor.",
  inactive: "Kullanıcı pasifleştirildi.",
}
