import type { Metadata } from "next"
import Link from "next/link"
import { LegalShell } from "@/components/legal/legal-shell"

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni — KoçUp",
  description:
    "6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında KoçUp aydınlatma metni: veri sorumlusu, işlenen veriler, amaç, saklama süresi ve haklarınız.",
  alternates: { canonical: "/kvkk" },
}

export default function KvkkPage() {
  return (
    <LegalShell title="KVKK Aydınlatma Metni" updated="—" draft={false}>
      <p>
        İşbu Aydınlatma Metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) md.
        10 uyarınca veri sorumlusu sıfatıyla{" "}
        <strong>[KoçUp / şirket unvanı]</strong> tarafından hazırlanmıştır.
      </p>

      <h2>1. Veri Sorumlusu</h2>
      <ul>
        <li>
          <strong>Unvan:</strong> [KoçUp / şirket unvanı]
        </li>
        <li>
          <strong>Adres:</strong> [şirket adresi]
        </li>
        <li>
          <strong>E-posta:</strong>{" "}
          <a href="mailto:kocupkocluk@gmail.com">kocupkocluk@gmail.com</a>
        </li>
      </ul>

      <h2>2. İşlenen Kişisel Veriler</h2>
      <ul>
        <li>
          <strong>Kimlik ve iletişim:</strong> ad-soyad, telefon, e-posta.
        </li>
        <li>
          <strong>Öğrenci başvurusu:</strong> sınıf/segment (LGS/YKS), hedef üniversite/bölüm/sıralama;
          veli ad-soyad ve veli telefonu.
        </li>
        <li>
          <strong>Koç başvurusu:</strong> branş, deneyim yılı, CV/bağlantı, mesaj.
        </li>
        <li>
          <strong>Kurum başvurusu:</strong> kurum adı, yetkili bilgisi, öğrenci/koç sayısı, mesaj.
        </li>
        <li>
          <strong>İşlem/kullanım verileri:</strong> koçluk sürecine ilişkin randevu, program, deneme ve
          ilerleme kayıtları; anonim kullanım istatistikleri.
        </li>
      </ul>

      <h2>3. Kişisel Verilerin İşlenme Amaçları</h2>
      <ul>
        <li>Başvuruların değerlendirilmesi ve talep sahipleriyle iletişim kurulması,</li>
        <li>Öğrenci–koç eşleştirmesi ve koçluk hizmetinin sunulması,</li>
        <li>Randevu, program ve ilerleme takibinin yürütülmesi,</li>
        <li>Hizmet kalitesinin ölçülmesi ve iyileştirilmesi,</li>
        <li>Hukuki yükümlülüklerin yerine getirilmesi.</li>
      </ul>

      <h2>4. İşlemenin Hukuki Sebepleri</h2>
      <p>
        Kişisel verileriniz KVKK md. 5 ve md. 6 kapsamında; bir sözleşmenin kurulması/ifası,
        veri sorumlusunun hukuki yükümlülüğü, meşru menfaat ve — gerekli hallerde — <strong>açık
        rızanız</strong> hukuki sebeplerine dayanılarak işlenir.
      </p>

      <h2>5. Reşit Olmayan (18 Yaş Altı) Kişilerin Verileri ve Veli Açık Rızası</h2>
      <p>
        Hizmetimizin muhatabı öğrenciler olduğundan, ilgili kişilerin bir kısmı 18 yaşından küçük
        olabilir. 18 yaşından küçük çocuklara ait kişisel veriler yalnızca{" "}
        <strong>veli/vasi açık rızası</strong> alınarak işlenir. Bu kapsamda:
      </p>
      <ul>
        <li>Başvuru sırasında veli/vasi bilgileri talep edilir ve iletişim veli üzerinden yürütülür,</li>
        <li>
          Çocuğa ait veriler, veli/vasinin açık rızasının kapsamı ve hizmetin gerektirdiği ölçüyle
          sınırlı olarak işlenir,
        </li>
        <li>
          Veli/vasi, çocuğa ait veriler bakımından aşağıdaki KVKK md. 11 haklarını çocuk adına
          kullanabilir,
        </li>
        <li>
          Geçerli bir veli/vasi açık rızası bulunmadığının tespiti halinde ilgili veriler silinir.
        </li>
      </ul>

      <h2>6. Kişisel Verilerin Aktarılması</h2>
      <p>
        Verileriniz; hizmetin ifası için görevli koç/personel, barındırma ve altyapı sağlayıcıları ve
        yasal olarak yetkili kamu kurum ve kuruluşları ile KVKK md. 8–9&apos;a uygun olarak
        paylaşılabilir. Yurt dışına aktarım söz konusu olduğunda mevzuatın öngördüğü şartlara uyulur.
      </p>

      <h2>7. Saklama Süresi</h2>
      <p>
        Kişisel verileriniz, işlenme amacının gerektirdiği süre ile ilgili mevzuatta öngörülen
        zamanaşımı süreleri boyunca saklanır; sürenin dolması veya amacın ortadan kalkması halinde
        silinir, yok edilir veya anonim hale getirilir.
      </p>

      <h2>8. KVKK Madde 11 Kapsamındaki Haklarınız</h2>
      <p>Her ilgili kişi (veya çocuk adına veli/vasi) veri sorumlusuna başvurarak:</p>
      <ul>
        <li>Kişisel verisinin işlenip işlenmediğini öğrenme,</li>
        <li>İşlenmişse buna ilişkin bilgi talep etme,</li>
        <li>İşlenme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme,</li>
        <li>Yurt içinde/yurt dışında aktarıldığı üçüncü kişileri bilme,</li>
        <li>Eksik/yanlış işlenmişse düzeltilmesini isteme,</li>
        <li>Silinmesini/yok edilmesini isteme,</li>
        <li>Düzeltme/silme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme,</li>
        <li>Otomatik sistemlerle analiz sonucu aleyhe bir sonucun ortaya çıkmasına itiraz etme,</li>
        <li>Kanuna aykırı işleme sebebiyle zarara uğraması halinde zararın giderilmesini talep etme</li>
      </ul>
      <p>haklarına sahiptir.</p>

      <h2>9. Başvuru Kanalı</h2>
      <p>
        KVKK md. 11 kapsamındaki taleplerinizi{" "}
        <a href="mailto:kocupkocluk@gmail.com">kocupkocluk@gmail.com</a> adresine iletebilirsiniz.
        Başvurunuz en geç 30 gün içinde sonuçlandırılır. Talebinizde kimliğinizi tevsik edici
        bilgilerin yer alması gerekir; çocuk adına yapılan başvurularda veli/vasi olduğunuzu gösteren
        bilgiler talep edilebilir.
      </p>

      <p>
        Kişisel verilerinizin nasıl kullanıldığına ilişkin ek bilgi için{" "}
        <Link href="/gizlilik">Gizlilik Politikası</Link> sayfamıza bakabilirsiniz.
      </p>
    </LegalShell>
  )
}
