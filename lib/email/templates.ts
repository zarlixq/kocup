import { getSiteUrl } from "@/lib/site-url"
import type { EmailMessage } from "@/lib/email/send"

// Kısa, Türkçe, KoçUp markalı e-posta şablonları. E-posta istemcileri harici
// CSS desteklemediği için burada inline style zorunlu (UI kuralının istisnası).

const PRIMARY = "#1B6B8A"
const ACCENT = "#F97316"

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
}

function layout(opts: { title: string; intro: string; cta: string; url: string; note: string }): string {
  const site = getSiteUrl()
  return `<!doctype html><html lang="tr"><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7">
<tr><td style="background:${PRIMARY};padding:20px 24px;text-align:left">
<img src="${site}/images/logo.png" alt="KoçUp" height="32" style="height:32px;filter:brightness(0) invert(1)">
</td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 12px;font-size:20px;color:#18181b">${escapeHtml(opts.title)}</h1>
<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#3f3f46">${opts.intro}</p>
<a href="${opts.url}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 20px;border-radius:10px">${escapeHtml(opts.cta)}</a>
<p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#71717a">${opts.note}</p>
<p style="margin:12px 0 0;font-size:11px;line-height:1.5;color:#a1a1aa;word-break:break-all">Buton çalışmazsa bu bağlantıyı tarayıcına yapıştır:<br>${opts.url}</p>
</td></tr>
<tr><td style="padding:14px 24px;background:#fafafa;font-size:11px;color:#a1a1aa">KoçUp Akademi · <a href="${site}/gizlilik" style="color:#a1a1aa">Gizlilik</a></td></tr>
</table></td></tr></table></body></html>`
}

export function verifyEmailTemplate(to: string, name: string, url: string): EmailMessage {
  return {
    to,
    subject: "KoçUp hesabını doğrula",
    html: layout({
      title: `Merhaba ${name}, hoş geldin!`,
      intro: "KoçUp hesabını etkinleştirmek için e-posta adresini doğrula. Doğrulamadan sonra UpPlan kurulumuyla kişisel yol haritanı oluşturacağız.",
      cta: "E-postamı doğrula",
      url,
      note: "Bu bağlantı sınırlı süre geçerlidir ve bir kez kullanılabilir. Bu kaydı sen yapmadıysan bu e-postayı yok sayabilirsin.",
    }),
    text: `Merhaba ${name},\n\nKoçUp hesabını doğrulamak için: ${url}\n\nBu kaydı sen yapmadıysan bu e-postayı yok say.`,
  }
}

export function passwordResetTemplate(to: string, url: string): EmailMessage {
  return {
    to,
    subject: "KoçUp şifre sıfırlama",
    html: layout({
      title: "Şifreni sıfırla",
      intro: "Şifre sıfırlama talebi aldık. Yeni şifreni belirlemek için aşağıdaki butona tıkla.",
      cta: "Yeni şifre belirle",
      url,
      note: "Bu talebi sen yapmadıysan bu e-postayı yok sayabilirsin; şifren değişmez.",
    }),
    text: `Şifreni sıfırlamak için: ${url}\n\nBu talebi sen yapmadıysan bu e-postayı yok say.`,
  }
}

export function invitationTemplate(to: string, name: string, url: string, inviter: string | null): EmailMessage {
  const by = inviter ? `${escapeHtml(inviter)} seni` : "Seni"
  return {
    to,
    subject: "KoçUp'a davetlisin",
    html: layout({
      title: `Merhaba ${name}`,
      intro: `${by} KoçUp'a davet etti. Şifreni belirleyip hesabını oluştur; ardından UpPlan ile kişisel yol haritanı ve haftalık programını çıkaralım.`,
      cta: "Daveti kabul et",
      url,
      note: "Davet bağlantısı 7 gün geçerlidir ve yalnızca bir kez kullanılabilir.",
    }),
    text: `Merhaba ${name},\n\n${inviter ? `${inviter} seni` : "Seni"} KoçUp'a davet etti. Hesabını oluşturmak için: ${url}\n\nBağlantı 7 gün geçerlidir.`,
  }
}
