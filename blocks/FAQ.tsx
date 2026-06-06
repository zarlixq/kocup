import { MessageCircle } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const FAQS = [
  {
    q: "Eğitim koçluğu nedir?",
    a: "Eğitim koçluğu, öğrencinin kendi öğrenme sürecini yönetmesine yardım eden bir hizmettir. Özel ders gibi konu anlatmaz; öğrencinin nasıl çalışacağını, neye öncelik vereceğini ve hedefe nasıl ilerleyeceğini planlar, takip eder ve revize eder.",
  },
  {
    q: "Hangi sınıflar için uygundur?",
    a: "9, 10, 11, 12. sınıf öğrencileri ve mezunlar için uygundur. YKS hazırlığı için en yaygın başlangıç 11. sınıf yazıdır; ancak 10. sınıftan itibaren başlamak avantaj sağlar.",
  },
  {
    q: "Ne zaman başlamak en iyisi?",
    a: "Sınavdan önce ne kadar erken başlanırsa o kadar iyi. 24 ay önceden başlamak ideal, 12 ay yaygın, 9 ay ise hâlâ yapılabilir. Önemli olan başladıktan sonra disiplinli ilerlemek.",
  },
  {
    q: "İlk ders ücretsiz mi?",
    a: "Evet, tanışma amaçlı ilk ders tamamen ücretsiz. İlk derste hedeflerini ve seviyeni konuşuyoruz; hiçbir ön ödeme veya taahhüt yok.",
  },
  {
    q: "Ücretler nasıl?",
    a: "Koçluk sana özel planlandığı için ihtiyacına göre belirlenir. Önce ücretsiz ilk derste tanışıyor, hedeflerini ve seviyeni konuşuyoruz; ardından sana en uygun planı birlikte netleştiriyoruz. Gizli ücret yok.",
  },
  {
    q: "Görüşmeler online mı, yüz yüze mi?",
    a: "Tüm görüşmeler Zoom veya Google Meet üzerinden online yapılmaktadır. Türkiye'nin her yerinden başvurabilir, istediğin yerden seansa katılabilirsin.",
  },
  {
    q: "Koç değiştirebilir miyim?",
    a: "Evet. Koçunla uyumun istediğin gibi gitmiyorsa müdüre bildirirsin, alternatif koç önerilir. Amacımız sürecin senin için verimli olması.",
  },
  {
    q: "Veliyi süreç içinde bilgilendiriyor musunuz?",
    a: "Evet. Düzenli veli bilgilendirme görüşmeleri ve yazılı raporlarla ailen her zaman gelişiminden haberdar olur.",
  },
  {
    q: "Koçlarınız sertifikalı mı?",
    a: "Evet. Ekibimizdeki tüm koçlar üniversite onaylı Psikoloji veya Psikolojik Danışmanlık bölümü mezunudur ve MYK Onaylı Eğitim Koçluğu Sertifikası'na sahiptir.",
  },
] as const

export default function FAQ() {
  return (
    <section id="sss" className="bg-[#FAFAF8] py-20 md:py-28 px-5 md:px-8 lg:px-12">
      <div className="max-w-3xl mx-auto">
        <div className="mb-12 motion-safe:animate-fade-up">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F97316] mb-3">
            SSS
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-zinc-900 leading-tight">
            Merak ettiğin{" "}
            <span className="text-[#1B6B8A]">her şey.</span>
          </h2>
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          {FAQS.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="border border-zinc-200 rounded-2xl bg-white px-5 md:px-6 last:border-b"
            >
              <AccordionTrigger className="text-left font-semibold text-zinc-900 text-sm md:text-base hover:no-underline py-5">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-zinc-600 leading-relaxed pb-5">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-12 text-center">
          <p className="text-sm text-zinc-500 mb-4">Hâlâ aklında soru işareti mi var?</p>
          <a
            href="https://wa.me/905333704391?text=Merhaba KoçUp"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] text-white font-semibold px-6 py-3 rounded-full hover:bg-[#1ebe5d] transition-colors text-sm shadow-md shadow-emerald-500/20"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp'tan yaz: 0533 370 43 91
          </a>
        </div>
      </div>
    </section>
  )
}
