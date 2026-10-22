import type { Metadata } from "next"
import Link from "next/link"
import { LegalShell } from "@/components/legal/legal-shell"
import { CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/legal/versions"
import { CookiePreferenceReset } from "@/components/legal/cookie-consent"

// TASLAK — hukukçu kontrolünden geçirilmeli.

export const metadata: Metadata = {
  title: "Çerez Politikası — KoçUp",
  description: "KoçUp'ta kullanılan zorunlu çerezler ve izne bağlı reklam ölçüm çerezleri.",
  alternates: { canonical: "/cerez-politikasi" },
}

export default function CerezPolitikasiPage() {
  return (
    <LegalShell title="Çerez Politikası" updated={LEGAL_UPDATED} draft={false}>
      <p>
        Çerezler, ziyaret ettiğiniz sitenin tarayıcınıza kaydettiği küçük metin dosyalarıdır. KoçUp&apos;ta kullanılan
        çerezler aşağıdadır.
      </p>

      <h2>1. Zorunlu Çerezler</h2>
      <p>Bu çerezler olmadan giriş yapılamaz ve site güvenli çalışmaz; izninize bağlı değildir.</p>
      <ul>
        <li>
          <strong>Oturum çerezleri (sb-…-auth-token):</strong> Supabase kimlik doğrulaması; giriş yaptığınız sürece
          oturumunuzu açık tutar.
        </li>
        <li>
          <strong>Çerez tercihi (kocup_cerez):</strong> çerez tercihinizi 12 ay hatırlar.
        </li>
        <li>
          <strong>Cloudflare Turnstile:</strong> kayıt ve giriş formlarında bot koruması için (etkinse) gerekli teknik
          veriler.
        </li>
      </ul>

      <h2>2. İzne Bağlı Çerezler</h2>
      <ul>
        <li>
          <strong>Google Ads (_gcl_*, gtag):</strong> reklam kampanyalarımızın sonuçlarını (ör. başvuru formunun
          gönderilmesi) ölçmek için. Yalnızca çerez bildiriminde &quot;Kabul et&quot; derseniz yüklenir.
        </li>
        <li>
          <strong>Meta Pixel (_fbp, fbq):</strong> Facebook/Instagram reklamlarımızın sonuçlarını (ör. ücretsiz kaydın
          tamamlanması) ölçmek için. Yalnızca çerez bildiriminde &quot;Kabul et&quot; derseniz yüklenir.
        </li>
      </ul>

      <h2>3. Birinci Taraf İstatistik Çerezi</h2>
      <ul>
        <li>
          <strong>kup_sid:</strong> herkese açık sayfalarda anonim ziyaret oturumu kimliği (12 ay). Adınız, e-postanız
          veya IP adresiniz bu kayda yazılmaz; yalnız toplam ziyaret istatistiği için kullanılır. [Hukukçu: bu çerezin
          izne bağlı tutulması gerekip gerekmediği değerlendirilmeli.]
        </li>
        <li>
          <strong>kup_utm:</strong> reklam bağlantısıyla geldiyseniz bağlantıdaki kampanya etiketleri (utm_source,
          utm_campaign vb.; 30 gün). Hangi reklamdan kayıt olunduğunu ölçmek içindir; kişisel veri içermez.
        </li>
      </ul>

      <h2>4. Tercihinizi Değiştirme</h2>
      <p>
        Tercihinizi aşağıdaki butonla sıfırlayıp bildirimi yeniden görebilir veya tarayıcı ayarlarınızdan çerezleri
        silebilirsiniz.
      </p>
      <CookiePreferenceReset />

      <h2>5. İletişim</h2>
      <p>
        Ayrıntılar için <Link href="/gizlilik">Gizlilik Politikası</Link> ve{" "}
        <Link href="/kvkk-aydinlatma">KVKK Aydınlatma Metni</Link>&apos;ne bakın veya{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> adresine yazın.
      </p>
    </LegalShell>
  )
}
