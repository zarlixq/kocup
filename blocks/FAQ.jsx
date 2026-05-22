"use client";
import { useState, useRef, useEffect } from "react";

const faqs = [
  {
    q: "Koçlar gerçekten psikoloji mezunu mu?",
    a: "Evet. Ekibimizdeki tüm koçlar üniversite onaylı Psikoloji veya Psikolojik Danışmanlık bölümü mezunudur. Ayrıca ayrı bir koçluk sertifikasına da sahipler. Hem psikoloji hem koçluk bilgisi bir arada.",
  },
  {
    q: "Görüşmeler online mı, yüz yüze mi yapılıyor?",
    a: "Görüşmeler Zoom veya Google Meet üzerinden online yapılmaktadır. Bu sayede Türkiye'nin her yerinden başvurabilir, istediğin yerden seansa katılabilirsin.",
  },
  {
    q: "İlk seans gerçekten ücretsiz mi?",
    a: "Evet, tamamen ücretsiz. İlk tanışma seansında koçunla tanışır, hedeflerini konuşursunuz. Beğenirsen devam edersin, beğenmezsen herhangi bir ödeme yapmak zorunda değilsin.",
  },
  {
    q: "Paket ortasında değiştirebilir miyim?",
    a: "Tabii ki. Sınav dönemine girdiğinde daha yoğun bir pakete geçebilir ya da ihtiyacın azaldığında daha hafif bir pakete düşebilirsin. Esnek yapı bizim için standart.",
  },
  {
    q: "Veliler sürece dahil olacak mı?",
    a: "Pro ve Sprint paketlerinde düzenli veli bilgilendirme görüşmeleri yapılıyor. Temel pakette ise aylık yazılı rapor paylaşılıyor. Ailen her zaman gelişiminden haberdar.",
  },
  {
    q: "YKS dışında LGS için de koçluk var mı?",
    a: "Evet. Ekibimizde LGS uzmanı koçlarımız da bulunmakta. Başvuru formunda sınıfını belirtmen yeterli, sana uygun koçu atıyoruz.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState(null);
  const refs = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("opacity-100", "translate-y-0");
            entry.target.classList.remove("opacity-0", "translate-y-6");
          }
        });
      },
      { threshold: 0.1 }
    );
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="sss" className="bg-white py-24 px-6 md:px-12 lg:px-24">
      <div className="max-w-3xl mx-auto">

        {/* Başlık */}
        <div
          ref={(el) => (refs.current[0] = el)}
          className="opacity-0 translate-y-6 transition-all duration-700 mb-12"
        >
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F97316] mb-4">
            SSS
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#1A1A1A] leading-tight">
            Merak ettiğin{" "}
            <span className="text-[#1B6B8A]">her şey.</span>
          </h2>
        </div>

        {/* SSS listesi */}
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              ref={(el) => (refs.current[i + 1] = el)}
              className="opacity-0 translate-y-6 transition-all duration-700"
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <div className="border border-[#EBEBEB] rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-[#1A1A1A] text-sm pr-4">{faq.q}</span>
                  <span
                    className={`shrink-0 w-6 h-6 rounded-full border border-[#EBEBEB] flex items-center justify-center transition-transform duration-300 ${
                      open === i ? "rotate-45 bg-[#F97316] border-[#F97316]" : ""
                    }`}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      fill="none"
                      stroke={open === i ? "white" : "#999"}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    >
                      <path d="M5 1v8M1 5h8" />
                    </svg>
                  </span>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    open === i ? "max-h-48" : "max-h-0"
                  }`}
                >
                  <p className="px-6 pb-5 text-sm text-gray-500 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Alt CTA */}
        <div
          ref={(el) => (refs.current[faqs.length + 1] = el)}
          className="opacity-0 translate-y-6 transition-all duration-700 mt-12 text-center"
          style={{ transitionDelay: "420ms" }}
        >
          <p className="text-sm text-gray-400 mb-4">Hâlâ aklında soru işareti mi var?</p>
          <a
            href="https://wa.me/90XXXXXXXXXX"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-[#1B6B8A] text-[#1B6B8A] font-semibold px-6 py-3 rounded-full hover:bg-[#1B6B8A] hover:text-white transition-colors text-sm"
          >
            WhatsApp'tan yaz
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </a>
        </div>

      </div>
    </section>
  );
}