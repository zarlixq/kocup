/**
 * Hero'daki panel önizlemesi. Şimdilik CSS ile çizilmiş temsili bir müdür
 * paneli gösterir; gerçek ekran görüntüsü hazır olunca içteki
 * "MOCKUP İÇERİĞİ" bloğunu next/image ile değiştirin:
 *
 *   <Image src="/images/kurumlar-panel.png" alt="KoçUp müdür paneli"
 *          width={1200} height={750} className="w-full h-auto" priority />
 */
export function HeroMockup() {
  return (
    <div className="relative" aria-hidden="true">
      {/* Arka parlama */}
      <div className="absolute -inset-4 bg-gradient-to-tr from-[#F97316]/20 to-[#1B6B8A]/30 blur-2xl rounded-[2rem] pointer-events-none" />

      <div className="relative rounded-2xl bg-white ring-1 ring-white/20 shadow-2xl shadow-black/40 overflow-hidden">
        {/* Tarayıcı çubuğu */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-100 border-b border-zinc-200">
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
          <span className="ml-3 flex-1 max-w-[220px] h-6 rounded-md bg-white border border-zinc-200 flex items-center px-2.5 text-[10px] text-zinc-400 font-medium">
            kocup.net/kurum
          </span>
        </div>

        {/* ── MOCKUP İÇERİĞİ (gerçek ekran görüntüsüyle değiştirilecek) ── */}
        <div className="p-4 sm:p-5 bg-zinc-50/80">
          {/* Başlık satırı */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="h-3 w-28 rounded bg-zinc-800/80 mb-1.5" />
              <div className="h-2 w-40 rounded bg-zinc-300" />
            </div>
            <div className="h-7 w-20 rounded-lg bg-[#F97316]" />
          </div>

          {/* Stat kartları */}
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            {[
              { value: "128", label: "Öğrenci" },
              { value: "12", label: "Koç" },
              { value: "%87", label: "Uyum" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white border border-zinc-200 p-3">
                <div className="text-base sm:text-lg font-extrabold text-[#1B6B8A] leading-none">
                  {s.value}
                </div>
                <div className="text-[10px] text-zinc-400 font-medium mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Grafik + koç listesi */}
          <div className="grid grid-cols-5 gap-2.5">
            <div className="col-span-2 rounded-xl bg-white border border-zinc-200 p-3 flex items-end gap-1.5 h-24">
              {[45, 65, 40, 80, 55, 90, 70].map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${h}%` }}
                  className={`flex-1 rounded-sm ${i === 5 ? "bg-[#F97316]" : "bg-[#1B6B8A]/70"}`}
                />
              ))}
            </div>
            <div className="col-span-3 rounded-xl bg-white border border-zinc-200 p-3 space-y-2.5">
              {[85, 62, 91].map((w, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#1B6B8A]/15 shrink-0" />
                  <div className="flex-1">
                    <div className="h-1.5 rounded-full bg-zinc-100">
                      <div
                        style={{ width: `${w}%` }}
                        className="h-full rounded-full bg-[#1B6B8A]"
                      />
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-zinc-500 tabular-nums">%{w}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* ── /MOCKUP İÇERİĞİ ── */}
      </div>
    </div>
  )
}
