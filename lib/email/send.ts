// E-posta gönderimi — Resend HTTP API (bağımlılık yok).
// RESEND_API_KEY yoksa isEmailEnabled() false döner; çağıranlar Supabase'in
// kendi e-posta servisine veya "linki kopyala" akışına düşer.

const RESEND_URL = "https://api.resend.com/emails"
const DEFAULT_FROM = "KoçUp <bildirim@kocupakademi.com>"

export function isEmailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY
}

export type EmailMessage = { to: string; subject: string; html: string; text: string }

export async function sendEmail(msg: EmailMessage): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, error: "E-posta servisi yapılandırılmamış." }

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || DEFAULT_FROM,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
    })
    if (!res.ok) {
      console.error("Resend hata:", res.status, await res.text().catch(() => ""))
      return { ok: false, error: "E-posta gönderilemedi." }
    }
    return { ok: true }
  } catch (err) {
    console.error("Resend istisna:", err)
    return { ok: false, error: "E-posta gönderilemedi." }
  }
}
