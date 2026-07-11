import { randomBytes } from "crypto"

// Karışıklık yaratan karakterler (0/O, 1/l/I) çıkarılmış güçlü geçici şifre.
// Kurum-import öğrencileri, manuel oluşturulan koç/org_admin hesapları için ortak.
export function generateTempPassword(len = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
  const bytes = randomBytes(len)
  let out = ""
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length]
  return out
}
