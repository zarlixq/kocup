import type { Metadata } from "next"
import Link from "next/link"
import { LegalShell } from "@/components/legal/legal-shell"

export const metadata: Metadata = {
  // [HUKUKÇU ONAYI BEKLİYOR — canlıya almadan önce gözden geçirilecek]
  title: "Gizlilik Politikası — KoçUp",
  description:
    "KoçUp gizlilik politikası: hangi kişisel verileri topladığımız, nasıl kullandığımız, kimlerle paylaştığımız ve haklarınız.",
  alternates: { canonical: "/gizlilik" },
}

export default function GizlilikPage() {
  return (
    <LegalShell title="Gizlilik Politikası" updated="—">
      <p>
        Bu Gizlilik Politikası, <strong>[KoçUp / şirket unvanı — sonra doldurulacak]</strong>{" "}
        (&quot;KoçUp&quot;, &quot;biz&quot;) tarafından işletilen web sitesi ve koçluk platformu
        aracılığıyla toplanan kişisel verilerin nasıl işlendiğini açıklar. Kişisel verilerinizin
        işlenmesine ilişkin ayrıntılı bilgilendirme için{" "}
        <Link href="/kvkk">KVKK Aydınlatma Metni</Link> sayfamızı da inceleyiniz.
      </p>

      <h2>1. Topladığımız Veriler</h2>
      <p>Platformumuz üzerinden aşağıdaki kişisel verileri toplayabiliriz:</p>
      <ul>
        <li>
          <strong>Öğrenci başvuru formu:</strong> ad-soyad, e-posta, telefon, sınıf/segment (LGS/YKS),
          hedef üniversite/bölüm/sıralama bilgileri ve veli ad-soyad ile veli telefon bilgisi.
        </li>
        <li>
          <strong>Koç başvuru formu:</strong> ad-soyad, telefon, e-posta, branş, deneyim yılı,
          CV/bağlantı ve iletmek istediğiniz mesaj.
        </li>
        <li>
          <strong>Kurum (demo) başvuru formu:</strong> kurum adı, yetkili ad-soyad, telefon, e-posta,
          öğrenci/koç sayısı ve mesaj.
        </li>
        <li>
          <strong>Platform kullanımı:</strong> hesap oluşturduğunuzda ve platformu kullandığınızda
          oluşan çalışma/randevu/deneme kayıtları gibi koçluk sürecine ilişkin veriler.
        </li>
        <li>
          <strong>Teknik veriler:</strong> ziyaret ettiğiniz sayfalar ve benzeri anonim/istatistiksel
          kullanım verileri.
        </li>
      </ul>

      <h2>2. Verileri Kullanma Amacımız</h2>
      <ul>
        <li>Başvurularınızı değerlendirmek ve sizinle iletişime geçmek,</li>
        <li>Öğrenciyi uygun koçla eşleştirmek ve koçluk hizmetini sunmak,</li>
        <li>Randevu, program ve ilerleme takibini yürütmek,</li>
        <li>Yasal yükümlülüklerimizi yerine getirmek ve hizmet kalitesini geliştirmek.</li>
      </ul>

      <h2>3. Reşit Olmayan (18 Yaş Altı) Kullanıcılar</h2>
      <p>
        Koçluk hizmetimiz doğası gereği öğrencilere yöneliktir ve öğrencilerin bir kısmı 18 yaşından
        küçük olabilir. 18 yaşından küçük bir kişinin kişisel verilerini yalnızca{" "}
        <strong>veli/vasi açık rızası</strong> ile işleriz. Başvuru sırasında veli bilgileri talep
        edilir ve iletişim öncelikle veli ile kurulur. Velinin rızasının bulunmadığını tespit
        ettiğimizde ilgili verileri işlemeyi durdurur ve sileriz. Ayrıntılar için{" "}
        <Link href="/kvkk">KVKK Aydınlatma Metni</Link>&apos;nin ilgili bölümüne bakınız.
      </p>

      <h2>4. Verilerin Paylaşımı</h2>
      <p>
        Kişisel verilerinizi pazarlama amacıyla üçüncü kişilere satmayız. Verileriniz yalnızca;
        hizmetin sunulması için görevli koç/personel ile, barındırma ve altyapı hizmeti aldığımız
        tedarikçilerle (ör. bulut/veritabanı sağlayıcısı) ve yasal olarak zorunlu hallerde yetkili
        kamu kurumları ile paylaşılabilir.
      </p>

      <h2>5. Saklama Süresi</h2>
      <p>
        Kişisel verilerinizi işleme amacının gerektirdiği süre ve ilgili mevzuatta öngörülen
        zamanaşımı/saklama süreleri boyunca saklarız. Amaç ortadan kalktığında verileriniz silinir,
        yok edilir veya anonim hale getirilir.
      </p>

      <h2>6. Veri Güvenliği</h2>
      <p>
        Verilerinizi yetkisiz erişime, kayba ve kötüye kullanıma karşı korumak için makul teknik ve
        idari tedbirleri alırız (erişim kontrolü, satır düzeyinde yetkilendirme, şifreli iletişim vb.).
      </p>

      <h2>7. Haklarınız</h2>
      <p>
        6698 sayılı Kanun (KVKK) kapsamındaki haklarınızı{" "}
        <Link href="/kvkk">KVKK Aydınlatma Metni</Link>&apos;nde belirtilen kanallardan
        kullanabilirsiniz.
      </p>

      <h2>8. İletişim</h2>
      <p>
        Gizlilikle ilgili sorularınız için:{" "}
        <a href="mailto:kocupkocluk@gmail.com">kocupkocluk@gmail.com</a>
      </p>
    </LegalShell>
  )
}
