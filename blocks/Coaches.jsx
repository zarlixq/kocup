"use client";
import { useEffect, useRef } from "react";

const coaches = [
  {
    initials: "AK",
    name: "Ayşe K.",
    title: "YKS Sayısal Uzmanı",
    desc: "Klinik Psikoloji mezunu. 5 yıldır öğrenci koçluğu yapıyor. Matematik ve Fen ağırlıklı çalışmalar.",
    bg: "bg-[#1B6B8A]",
    tags: ["YKS Sayısal", "Zaman yönetimi", "Sınav kaygısı"],
  },
  {
    initials: "FY",
    name: "Fatma Y.",
    title: "LGS & YKS Sözel Uzmanı",
    desc: "Psikoloji Bölümü mezunu. LGS ve YKS Sözel alanında koçluk. Motivasyon ve hedef belirleme odaklı.",
    bg: "bg-[#F97316]",
    tags: ["YKS Sözel", "LGS", "Motivasyon"],
  },
  {
    initials: "MÖ",
    name: "Merve Ö.",
    title: "Sınav Kaygısı Uzmanı",
    desc: "Psikolojik Danışmanlık mezunu. Sınav kaygısı ve psikolojik destek konusunda uzmanlaşmış.",
    bg: "bg-emerald-600",
    tags: ["Psikolojik destek", "Kaygı yönetimi", "Özgüven"],
  },
  {
    initials: "ZT",
    name: "Zeynep T.",
    title: "Program & Takip Uzmanı",
    desc: "Psikoloji mezunu. TYT-AYT program tasarımı, zaman yönetimi ve düzenli takip konusunda uzman.",
    bg: "bg-violet-600",
    tags: ["Program tasarımı", "TYT-AYT", "Takip sistemi"],
  },
];

export default function Coaches() {
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
    <section id="koclarimiz" className="bg-[#0F1F28] py-24 px-6 md:px-12 lg:px-24">
      <div className="max-w-5xl mx-auto">

        {/* Başlık */}
        <div
          ref={(el) => (refs.current[0] = el)}
          className="opacity-0 translate-y-6 transition-all duration-700 mb-16"
        >
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#F97316] mb-4">
            Ekibimiz
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight max-w-lg">
            Psikoloji mezunu,{" "}
            <span className="text-[#F97316]">sınav uzmanı</span> koçlar.
          </h2>
          <p className="text-gray-400 text-base mt-4 max-w-xl leading-relaxed">
            Ekibimizdeki her koç hem psikoloji eğitimi almış hem de koçluk sertifikasına sahip. Sadece ders değil, gerçek bir rehberlik alıyorsun.
          </p>
        </div>

        {/* Koç kartları */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {coaches.map((coach, i) => (
            <div
              key={i}
              ref={(el) => (refs.current[i + 1] = el)}
              className="opacity-0 translate-y-6 transition-all duration-700"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-full hover:bg-white/10 transition-colors duration-200">

                {/* Avatar */}
                <div className={`w-12 h-12 rounded-xl ${coach.bg} flex items-center justify-center text-white font-bold text-base mb-4`}>
                  {coach.initials}
                </div>

                <h3 className="text-white font-bold text-base mb-0.5">{coach.name}</h3>
                <p className="text-[#F97316] text-xs font-semibold mb-3">{coach.title}</p>
                <p className="text-gray-400 text-xs leading-relaxed mb-4">{coach.desc}</p>

                {/* Etiketler */}
                <div className="flex flex-wrap gap-1.5">
                  {coach.tags.map((tag, j) => (
                    <span
                      key={j}
                      className="text-xs bg-white/10 text-gray-300 px-2.5 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Sertifika badge */}
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 8l3.5 3.5L13 4" />
                  </svg>
                  <span className="text-xs text-gray-400">Sertifikalı koç</span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}