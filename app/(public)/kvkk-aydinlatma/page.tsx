import type { Metadata } from "next"
import Link from "next/link"
import { LegalShell } from "@/components/legal/legal-shell"
import { CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/legal/versions"

// TASLAK — hukukçu kontrolünden geçirilmeli. Metin değişince lib/legal/versions.ts güncellenir.

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni — KoçUp",
  description:
    "6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında KoçUp aydınlatma metni: veri sorumlusu, işlenen veriler, amaç, saklama süresi, aktarım ve haklarınız.",
  alternates: { canonical: "/kvkk-aydinlatma" },
}

export default function KvkkAydinlatmaPage() {
  return (
    <LegalShell title="KVKK Aydınlatma Metni" updated={LEGAL_UPDATED} draft={false}>
      <p>
        İşbu Aydınlatma Metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) md. 10 uyarınca veri
        sorumlusu sıfatıyla <strong>[KoçUp / şirket unvanı]</strong> (&quot;KoçUp&quot;) tarafından hazırlanmıştır.
      </p>

      <h2>1. Veri Sorumlusu</h2>
      <ul>
        <li><strong>Unvan:</strong> [KoçUp / şirket unvanı]</li>
        <li><strong>Adres:</strong> [şirket adresi]</li>
        <li>
          <strong>E-posta:</strong> <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </li>
      </ul>

      <h2>2. İşlenen Kişisel Veriler</h2>
      <ul>
        <li>
          <strong>Hesap bilgileri:</strong> ad-soyad, e-posta, (varsa) telefon, şifrenizin geri döndürülemez özeti,
          sınav segmenti, sınıf/mezun durumu, alan, 18 yaş altı beyanı ve yasal metin onaylarınızın tarih/saat ve sürüm bilgisi.
        </li>
        <li>
          <strong>Çalışma kayıtları:</strong> soru çözüm kayıtları, yanlış defteri, deneme sonuçları ve yüklediğiniz deneme
          dosyaları, konu öz değerlendirmeleri, müsaitlik bilgisi, UpPlan yol haritası ve haftalık program, hedefler.
        </li>
        <li>
          <strong>Kullanım verileri:</strong> giriş zamanları, sayfa görüntüleme istatistikleri, kayıt kaynağı (UTM
          parametreleri), güvenlik amaçlı IP adresi özetleri ve geri bildirimleriniz (isteğe bağlı ekran görüntüsü dahil).
        </li>
        <li>
          <strong>Başvuru verileri:</strong> koçluk/kurum başvurularında paylaştığınız iletişim, veli ve hedef bilgileri.
        </li>
      </ul>

      <h2>3. İşleme Amaçları</h2>
      <ul>
        <li>Hesabınızın oluşturulması, e-posta doğrulaması ve güvenli girişin sağlanması,</li>
        <li>UpPlan ile kişisel yol haritası, haftalık program ve eksik konu/formül analizinin üretilmesi,</li>
        <li>Koç veya kurumla çalışıyorsanız çalışma verilerinizin onlarla paylaşılması ve koçluk hizmetinin yürütülmesi,</li>
        <li>Hizmetin ölçülmesi, iyileştirilmesi ve kayıt kanallarının (reklam kampanyaları) performansının değerlendirilmesi,</li>
        <li>Kötüye kullanımın (otomatik kayıt, kaba kuvvet giriş denemesi) önlenmesi,</li>
        <li>Hukuki yükümlülüklerin yerine getirilmesi ve taleplerinizin yanıtlanması.</li>
      </ul>

      <h2>4. Hukuki Sebepler</h2>
      <p>
        Kişisel verileriniz KVKK md. 5/2 kapsamında; sözleşmenin kurulması ve ifası (hesap ve hizmet), veri
        sorumlusunun hukuki yükümlülüğü, ilgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla meşru
        menfaat (güvenlik, hizmet iyileştirme) ve gerekli hallerde açık rızanız hukuki sebeplerine dayanılarak işlenir.
      </p>

      <h2>5. 18 Yaşından Küçük Kullanıcılar</h2>
      <p>
        18 yaşından küçük kullanıcılar kayıt sırasında Hizmeti velilerinin bilgisi dahilinde kullandıklarını beyan eder.
        Veli/vasi, çocuğa ait veriler bakımından aşağıdaki haklarını çocuk adına kullanabilir; geçerli bir veli bilgisi
        bulunmadığı tespit edilirse hesap ve ilgili veriler silinir.
      </p>

      <h2>6. Aktarım ve Yurt Dışına Aktarım</h2>
      <p>Verileriniz yalnızca hizmetin sunulması için gerekli ölçüde aşağıdaki alıcılarla paylaşılır:</p>
      <ul>
        <li><strong>Supabase</strong> (veritabanı, kimlik doğrulama ve dosya depolama altyapısı),</li>
        <li><strong>Vercel</strong> (uygulama barındırma),</li>
        <li><strong>Resend</strong> (doğrulama, şifre sıfırlama ve davet e-postalarının gönderimi),</li>
        <li><strong>Cloudflare</strong> (Turnstile bot koruması, etkinse),</li>
        <li><strong>Google</strong> (yalnızca çerez tercihinizde izin verirseniz reklam ölçümü),</li>
        <li>Koçunuz veya kurumunuz (yalnızca bir koça/kuruma bağlıysanız),</li>
        <li>Talep halinde yetkili kamu kurum ve kuruluşları.</li>
      </ul>
      <p>
        Bu hizmet sağlayıcıların sunucuları yurt dışında (ör. Avrupa Birliği ve/veya ABD) bulunabilir. Yurt dışına
        aktarım KVKK md. 9 ve ilgili ikincil mevzuatta öngörülen güvencelere (standart sözleşme vb.) uygun olarak
        yapılır. [Hukukçu: güncel md. 9 mekanizması ve bildirim yükümlülüğü teyit edilmeli.]
      </p>

      <h2>7. Saklama Süresi</h2>
      <ul>
        <li>Hesap ve çalışma verileri: hesabınız açık olduğu sürece; hesabınızı sildiğinizde derhal silinir.</li>
        <li>Kullanılmayan hesaplar: [24 ay] hareketsizlikten sonra bildirim yapılarak silinir veya anonimleştirilir.</li>
        <li>Güvenlik sayaçları (rate limit): en fazla 1 gün.</li>
        <li>Muhasebe/ödeme kayıtları (varsa): ilgili mevzuattaki saklama süreleri boyunca.</li>
        <li>Davet kayıtları: kabul edilmeyen davetler [6 ay] sonra silinir.</li>
      </ul>

      <h2>8. KVKK Madde 11 Kapsamındaki Haklarınız</h2>
      <p>Veri sorumlusuna başvurarak:</p>
      <ul>
        <li>Kişisel verinizin işlenip işlenmediğini öğrenme ve işlenmişse bilgi talep etme,</li>
        <li>İşlenme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme,</li>
        <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme,</li>
        <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme,</li>
        <li>KVKK md. 7 şartları çerçevesinde silinmesini veya yok edilmesini isteme,</li>
        <li>Düzeltme/silme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme,</li>
        <li>Münhasıran otomatik sistemlerle analiz edilmesi sonucu aleyhinize bir sonucun ortaya çıkmasına itiraz etme,</li>
        <li>Kanuna aykırı işleme sebebiyle zarara uğramanız halinde zararın giderilmesini talep etme</li>
      </ul>
      <p>
        haklarına sahipsiniz. Öğrenci hesapları <strong>Ayarlar → Hesabımı sil</strong> ile tüm verilerini kendileri
        silebilir.
      </p>

      <h2>9. Başvuru Yolu</h2>
      <p>
        Taleplerinizi <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> adresine, kimliğinizi tevsik edici bilgilerle
        iletebilirsiniz. Başvurunuz en geç 30 gün içinde ücretsiz olarak sonuçlandırılır. Çocuk adına yapılan
        başvurularda veli/vasi olduğunuzu gösteren bilgi talep edilebilir.
      </p>

      <p>
        Ayrıntılar için <Link href="/gizlilik">Gizlilik Politikası</Link> ve{" "}
        <Link href="/cerez-politikasi">Çerez Politikası</Link> sayfalarına bakabilirsiniz.
      </p>
    </LegalShell>
  )
}
