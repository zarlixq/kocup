import type { Metadata } from "next"
import Link from "next/link"
import { LegalShell } from "@/components/legal/legal-shell"
import { CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/legal/versions"

// TASLAK — hukukçu kontrolünden geçirilmeli. Metin değişince lib/legal/versions.ts güncellenir.

export const metadata: Metadata = {
  title: "Gizlilik Politikası — KoçUp",
  description:
    "KoçUp gizlilik politikası: hangi verileri topladığımız, neden kullandığımız, ne kadar sakladığımız, kimlerle paylaştığımız ve haklarınız.",
  alternates: { canonical: "/gizlilik" },
}

export default function GizlilikPage() {
  return (
    <LegalShell title="Gizlilik Politikası" updated={LEGAL_UPDATED} draft={false}>
      <p>
        Bu politika, <strong>[KoçUp / şirket unvanı]</strong> (&quot;KoçUp&quot;, &quot;biz&quot;) tarafından işletilen web
        sitesi ve öğrenci/koç/kurum panellerinde kişisel verilerin nasıl işlendiğini özetler. Yasal ayrıntılar için{" "}
        <Link href="/kvkk-aydinlatma">KVKK Aydınlatma Metni</Link>&apos;ni inceleyin.
      </p>

      <h2>1. Topladığımız Veriler</h2>
      <h3>Hesap bilgileri</h3>
      <p>
        Ad-soyad, e-posta, (varsa) telefon, şifre (yalnızca geri döndürülemez özeti), sınav segmenti, sınıf veya mezun
        durumu, alan, 18 yaş altı beyanı ve yasal metinleri onayladığınız tarih/saat ile metin sürümü.
      </p>
      <h3>Çalışma, deneme ve soru kayıtları</h3>
      <p>
        Girdiğiniz soru çözüm kayıtları, yanlış defteri, deneme sonuçları ve yüklediğiniz deneme dosyaları, konu öz
        değerlendirmeleri, müsait olduğunuz saatler, UpPlan yol haritası, haftalık program ve hedefleriniz.
      </p>
      <h3>Kullanım verileri</h3>
      <p>
        Giriş zamanları, ziyaret edilen sayfalara ait anonim istatistikler, sizi siteye getiren kampanya bilgisi
        (utm_source / utm_medium / utm_campaign), güvenlik için IP adresinin geri döndürülemez özeti ve gönderdiğiniz
        geri bildirimler (isteğe bağlı ekran görüntüsü dahil).
      </p>

      <h2>2. Verileri Neden Kullanıyoruz?</h2>
      <ul>
        <li>Hesabınızı oluşturmak, e-postanızı doğrulamak ve güvenli girişi sağlamak,</li>
        <li>Size özel yol haritası ve haftalık program çıkarmak, yanlışlarınızdan eksik konu ve formülleri bulmak,</li>
        <li>Bir koça veya kuruma bağlıysanız ilerlemenizi onlarla paylaşmak,</li>
        <li>Hizmeti geliştirmek ve hangi kayıt kanallarının işe yaradığını ölçmek,</li>
        <li>Sahte kayıt ve izinsiz giriş denemelerini engellemek,</li>
        <li>Yasal yükümlülüklerimizi yerine getirmek.</li>
      </ul>
      <p>Verilerinizi satmıyoruz ve reklam amacıyla üçüncü kişilerle paylaşmıyoruz.</p>

      <h2>3. Ne Kadar Saklıyoruz?</h2>
      <ul>
        <li>Hesabınız açık olduğu sürece. Hesabınızı silerseniz hesap ve çalışma verileriniz derhal silinir.</li>
        <li>Uzun süre kullanılmayan hesaplar [24 ay] sonra bildirimle silinir veya anonimleştirilir.</li>
        <li>Güvenlik sayaçları en fazla 1 gün tutulur.</li>
        <li>Mevzuat gereği saklanması zorunlu kayıtlar (ör. ödeme) yasal süre boyunca saklanır.</li>
      </ul>

      <h2>4. Kimlerle Paylaşıyoruz?</h2>
      <ul>
        <li><strong>Supabase:</strong> veritabanı, kimlik doğrulama ve dosya depolama,</li>
        <li><strong>Vercel:</strong> uygulamanın barındırılması,</li>
        <li><strong>Resend:</strong> doğrulama, şifre sıfırlama ve davet e-postaları,</li>
        <li><strong>Cloudflare Turnstile:</strong> bot koruması (etkinse),</li>
        <li><strong>Google Ads:</strong> yalnızca çerez tercihinde izin verirseniz reklam ölçümü,</li>
        <li>Bağlı olduğunuz koç veya kurum (yalnızca bağlıysanız).</li>
      </ul>
      <p>
        Bu sağlayıcıların sunucuları yurt dışında (ör. AB ve/veya ABD) bulunabilir; aktarım KVKK md. 9&apos;a uygun
        güvencelerle yapılır.
      </p>

      <h2>5. Güvenlik</h2>
      <p>
        Veriler şifreli bağlantı (HTTPS) üzerinden iletilir, veritabanında her tabloda satır düzeyinde erişim kuralları
        uygulanır; her kullanıcı yalnızca yetkili olduğu verileri görebilir.
      </p>

      <h2>6. Haklarınız</h2>
      <p>
        KVKK md. 11 kapsamında verilerinize erişme, düzeltme, silme, aktarıldığı kişileri öğrenme ve itiraz etme
        haklarına sahipsiniz. Öğrenci hesabınızı <strong>Ayarlar → Hesabımı sil</strong> ile kendiniz silebilirsiniz.
      </p>

      <h2>7. Çerezler</h2>
      <p>
        Oturumunuzu açık tutmak için zorunlu çerezler kullanıyoruz; reklam ölçüm çerezleri yalnızca izninizle
        yüklenir. Ayrıntılar: <Link href="/cerez-politikasi">Çerez Politikası</Link>.
      </p>

      <h2>8. İletişim</h2>
      <p>
        Sorularınız ve talepleriniz için: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </LegalShell>
  )
}
