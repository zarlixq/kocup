import type { Metadata } from "next"
import Link from "next/link"
import { LegalShell } from "@/components/legal/legal-shell"

export const metadata: Metadata = {
  // [HUKUKÇU ONAYI BEKLİYOR — canlıya almadan önce gözden geçirilecek]
  title: "Kullanım Koşulları — KoçUp",
  description:
    "KoçUp web sitesi ve koçluk platformunun kullanımına ilişkin koşullar, kullanıcı yükümlülükleri ve sorumluluk sınırları.",
  alternates: { canonical: "/kullanim-kosullari" },
}

export default function KullanimKosullariPage() {
  return (
    <LegalShell title="Kullanım Koşulları" updated="—">
      <p>
        Bu Kullanım Koşulları, <strong>[KoçUp / şirket unvanı — sonra doldurulacak]</strong>{" "}
        tarafından sunulan web sitesi ve koçluk platformunun (&quot;Hizmet&quot;) kullanımına
        ilişkin şartları düzenler. Hizmeti kullanarak bu koşulları kabul etmiş sayılırsınız.
      </p>

      <h2>1. Hizmetin Kapsamı</h2>
      <p>
        KoçUp; öğrenci, koç, veli ve kurumlara yönelik dijital koçluk yönetimi (başvuru, eşleştirme,
        randevu, program ve ilerleme takibi) sunar. Hizmetin içeriği önceden bildirilerek
        güncellenebilir.
      </p>

      <h2>2. Hesap ve Başvuru</h2>
      <ul>
        <li>Başvuru ve kayıt sırasında doğru, güncel ve eksiksiz bilgi vermeyi kabul edersiniz.</li>
        <li>Hesap güvenliğinden ve hesabınız üzerinden yapılan işlemlerden siz sorumlusunuz.</li>
        <li>
          Başvuru formlarında paylaşılan kişisel veriler{" "}
          <Link href="/kvkk">KVKK Aydınlatma Metni</Link> ve{" "}
          <Link href="/gizlilik">Gizlilik Politikası</Link> kapsamında işlenir.
        </li>
      </ul>

      <h2>3. Reşit Olmayan Kullanıcılar</h2>
      <p>
        18 yaşından küçük kullanıcılar Hizmeti yalnızca veli/vasi bilgisi ve onayı ile
        kullanabilir. Veli/vasi, çocuğu adına bu koşulları kabul ettiğini beyan eder.
      </p>

      <h2>4. Kullanıcı Yükümlülükleri</h2>
      <ul>
        <li>Hizmeti hukuka aykırı veya üçüncü kişilerin haklarını ihlal edecek şekilde kullanmamak,</li>
        <li>Platformun güvenliğini tehlikeye atacak eylemlerde bulunmamak,</li>
        <li>Başkalarına ait bilgileri izinsiz paylaşmamak.</li>
      </ul>

      <h2>5. Fikri Mülkiyet</h2>
      <p>
        Platform üzerindeki marka, logo, yazılım ve içerikler KoçUp&apos;a veya lisans verenlerine
        aittir; izinsiz kullanılamaz, kopyalanamaz veya dağıtılamaz.
      </p>

      <h2>6. Sorumluluğun Sınırlandırılması</h2>
      <p>
        Hizmet &quot;olduğu gibi&quot; sunulur. KoçUp, kesintisiz veya hatasız hizmet garantisi
        vermez; mevzuatın izin verdiği ölçüde dolaylı zararlardan sorumlu değildir. Koçluk hizmeti bir
        eğitim/danışmanlık desteğidir ve belirli bir sınav sonucu garantisi içermez.
      </p>

      <h2>7. Değişiklikler</h2>
      <p>
        Bu koşullar zaman zaman güncellenebilir. Güncel sürüm bu sayfada yayımlandığı andan itibaren
        geçerli olur.
      </p>

      <h2>8. İletişim</h2>
      <p>
        Sorularınız için:{" "}
        <a href="mailto:kocupkocluk@gmail.com">kocupkocluk@gmail.com</a>
      </p>
    </LegalShell>
  )
}
