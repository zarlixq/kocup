"use client";
import { useState, useRef, useEffect } from "react";

export default function ContactForm() {
  const ref = useRef(null);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    ad: "",
    sinif: "",
    telefon: "",
    paket: "",
    hedef: "",
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          ref.current?.classList.add("opacity-100", "translate-y-0");
          ref.current?.classList.remove("opacity-0", "translate-y-6");
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <section id="basvuru" className="bg-[#1B6B8A] py-24 px-6 md:px-12 lg:px-24">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Sol — yazı */}
          <div
            ref={ref}
            className="opacity-0 translate-y-6 transition-all duration-700"
          >
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-orange-200 mb-4">
              Başvuru
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight mb-6">
              İlk adımı sen at,{" "}
              <span className="text-[#F97316]">gerisini biz hallederiz.</span>
            </h2>
            <p className="text-blue-100 text-base leading-relaxed mb-8">
              Formu doldur, 24 saat içinde seni arayalım. İlk tanışma seansı tamamen ücretsiz.
            </p>

            {/* Güvence maddeleri */}
            <div className="space-y-3">
              {[
                "İlk seans tamamen ücretsiz",
                "24 saat içinde seni arıyoruz",
                "Psikoloji mezunu uzman koç",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#F97316] flex items-center justify-center shrink-0">
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M3 8l3.5 3.5L13 4" />
                    </svg>
                  </div>
                  <span className="text-blue-100 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sağ — form */}
          <div className="bg-white rounded-2xl p-7 shadow-sm">
            {sent ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M3 8l3.5 3.5L13 4" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">Başvurun alındı!</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  En geç 24 saat içinde seni arayacağız. Telefona yakın dur!
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Ad Soyad
                    </label>
                    <input
                      name="ad"
                      value={form.ad}
                      onChange={handleChange}
                      placeholder="Ahmet Yılmaz"
                      required
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B6B8A] transition-colors bg-gray-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Sınıf
                    </label>
                    <select
                      name="sinif"
                      value={form.sinif}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B6B8A] transition-colors bg-gray-50 focus:bg-white text-gray-700"
                    >
                      <option value="">Seçin</option>
                      <option>8. Sınıf (LGS)</option>
                      <option>9. Sınıf</option>
                      <option>10. Sınıf</option>
                      <option>11. Sınıf</option>
                      <option>12. Sınıf (YKS)</option>
                      <option>Mezun</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Telefon
                    </label>
                    <input
                      name="telefon"
                      value={form.telefon}
                      onChange={handleChange}
                      placeholder="05XX XXX XX XX"
                      required
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B6B8A] transition-colors bg-gray-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Paket
                    </label>
                    <select
                      name="paket"
                      value={form.paket}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B6B8A] transition-colors bg-gray-50 focus:bg-white text-gray-700"
                    >
                      <option value="">Seçin</option>
                      <option>Temel — ₺2.500/ay</option>
                      <option>Pro — ₺4.500/ay</option>
                      <option>Sprint — ₺6.500/ay</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Hedef okul / bölüm{" "}
                    <span className="font-normal text-gray-400">(isteğe bağlı)</span>
                  </label>
                  <textarea
                    name="hedef"
                    value={form.hedef}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Örn: Boğaziçi İşletme hedefliyorum, şu an TYT'de 320 net yapıyorum..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B6B8A] transition-colors bg-gray-50 focus:bg-white resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#F97316] text-white font-semibold py-3.5 rounded-full hover:bg-[#ea6c10] transition-all hover:scale-[1.02] text-sm"
                >
                  Ücretsiz tanışma seansı talep et →
                </button>

                <p className="text-center text-xs text-gray-400">
                  Bilgilerin gizli tutulur. Spam yok.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}