import type { Metadata } from "next"
import Link from "next/link"
import { LegalShell } from "@/components/legal/legal-shell"
import { CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/legal/versions"

// TASLAK — hukukçu kontrolünden geçirilmeli. Metin değişince lib/legal/versions.ts güncellenir.

export const metadata: Metadata = {
  title: "Kullanım Şartları — KoçUp",
  description:
    "KoçUp web sitesi, ücretsiz UpPlan hesabı ve koçluk platformunun kullanımına ilişkin şartlar, kullanıcı yükümlülükleri ve sorumluluk sınırları.",
  alternates: { canonical: "/kullanim-sartlari" },
}

export default function KullanimSartlariPage() {
  return (
    <LegalShell title="Kullanım Şartları" updated={LEGAL_UPDATED} draft={false}>
      <p>
        Bu şartlar, <strong>[KoçUp / şirket unvanı]</strong> tarafından sunulan web sitesi, ücretsiz öğrenci hesabı
        (UpPlan) ve koçluk platformunun (&quot;Hizmet&quot;) kullanımını düzenler. Hesap oluşturarak bu şartları kabul
        etmiş olursunuz.
      </p>

      <h2>1. Hizmetin Kapsamı</h2>
      <p>
        Ücretsiz öğrenci hesabı; konu taraması, kişisel yol haritası, haftalık program, soru/deneme kaydı ve yanlış
        analizi araçlarını içerir. Birebir koçluk ayrı ve ücretli bir hizmettir. Hizmetin kapsamı önceden duyurularak
        değiştirilebilir.
      </p>

      <h2>2. Hesap</h2>
      <ul>
        <li>Kayıtta doğru ve güncel bilgi vermeyi kabul edersiniz; her kişi tek hesap açabilir.</li>
        <li>E-posta adresinizi doğrulamadan hesabınızı kullanamazsınız.</li>
        <li>Şifrenizin gizliliğinden ve hesabınız üzerinden yapılan işlemlerden siz sorumlusunuz.</li>
        <li>Hesabınızı dilediğiniz zaman Ayarlar sayfasından silebilirsiniz.</li>
      </ul>

      <h2>3. 18 Yaşından Küçük Kullanıcılar</h2>
      <p>
        18 yaşından küçükseniz Hizmeti velinizin (anne, baba veya vasiniz) bilgisi dahilinde kullandığınızı beyan
        edersiniz. Veli, bu şartları çocuğu adına kabul etmiş sayılır ve çocuğun verilerine ilişkin hakları
        kullanabilir.
      </p>

      <h2>4. Kullanıcı Yükümlülükleri</h2>
      <ul>
        <li>Hizmeti hukuka aykırı amaçlarla veya başkalarının haklarını ihlal edecek şekilde kullanmamak,</li>
        <li>Otomatik araçlarla toplu kayıt, giriş denemesi veya veri çekme yapmamak,</li>
        <li>Platformun güvenliğini veya çalışmasını bozacak girişimlerde bulunmamak.</li>
      </ul>
      <p>Bu kurallara aykırı hesaplar uyarı yapılarak veya gerekirse doğrudan askıya alınabilir.</p>

      <h2>5. Öneriler Hakkında</h2>
      <p>
        UpPlan&apos;ın yol haritası, program ve eksik konu önerileri girdiğiniz verilere dayanan yardımcı
        planlamalardır; belirli bir net, puan veya sıralama garantisi vermez. Çalışma kararlarınız size aittir.
      </p>

      <h2>6. Fikri Mülkiyet</h2>
      <p>
        Platformdaki yazılım, marka, logo ve içerikler KoçUp&apos;a veya lisans verenlerine aittir; izinsiz kopyalanamaz
        ve dağıtılamaz. Girdiğiniz çalışma kayıtları size aittir.
      </p>

      <h2>7. Sorumluluğun Sınırlandırılması</h2>
      <p>
        Hizmet &quot;olduğu gibi&quot; sunulur; kesintisiz veya hatasız çalışma garantisi verilmez. Mevzuatın izin verdiği
        ölçüde dolaylı zararlardan sorumluluk kabul edilmez.
      </p>

      <h2>8. Kişisel Veriler</h2>
      <p>
        Kişisel verileriniz <Link href="/kvkk-aydinlatma">KVKK Aydınlatma Metni</Link>,{" "}
        <Link href="/gizlilik">Gizlilik Politikası</Link> ve <Link href="/cerez-politikasi">Çerez Politikası</Link>{" "}
        kapsamında işlenir.
      </p>

      <h2>9. Değişiklikler</h2>
      <p>
        Bu şartlar güncellenebilir; önemli değişiklikler kayıtlı e-posta adresinize veya panel üzerinden duyurulur.
        Güncel sürüm bu sayfada yayımlandığı tarihten itibaren geçerlidir.
      </p>

      <h2>10. Uygulanacak Hukuk ve İletişim</h2>
      <p>
        Bu şartlar Türkiye Cumhuriyeti hukukuna tabidir. Sorularınız için:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </LegalShell>
  )
}
