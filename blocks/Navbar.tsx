"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

const NAV_LINKS = [
  { href: "/#nasil-calisir", label: "Nasıl Çalışır" },
  { href: "/#hizmetler", label: "Hizmetler" },
  { href: "/#fiyatlar", label: "Koçluk" },
  { href: "/araclar", label: "Araçlar" },
  { href: "/kurumlar", label: "Kurumlar" },
  { href: "/blog", label: "Blog" },
  { href: "/#sss", label: "SSS" },
]

// Herkese açık sayfaların üst çubuğu: her zaman görünür, dolu arka planlı ve
// sabit (sticky, akışta yer kaplar → içerik altında kalmaz). Scroll'a bağlı
// göster/gizle ya da şeffaf→dolu geçiş yok. Yükseklik: mobil 64px, md+ 80px;
// anchor bölümleri scroll-mt-20 md:scroll-mt-24 ile bunu telafi eder.
export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-zinc-200 shadow-sm">
      <nav className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-5 md:px-8 xl:px-12 h-16 md:h-20">
        <Link href="/" className="flex items-center shrink-0">
          {/* logo.png 1408×768; gösterim yüksekliği 48px (mobil) / 60px (md+). */}
          <Image
            src="/images/logo.png"
            alt="KoçUp Akademi"
            width={165}
            height={90}
            className="object-contain h-12 w-auto md:h-[60px]"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-4 xl:gap-7">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap text-sm font-medium text-zinc-600 hover:text-[#1B6B8A] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <Link
            href="/giris/ogrenci"
            className="hidden sm:inline-flex whitespace-nowrap text-sm font-semibold px-3 py-2 rounded-full text-[#1B6B8A] hover:bg-[#1B6B8A]/5 transition-colors"
          >
            Öğrenci Girişi
          </Link>
          <Link
            href="/giris/koc"
            className="hidden md:inline-flex lg:hidden xl:inline-flex whitespace-nowrap text-sm font-semibold border px-4 py-2 rounded-full text-[#F97316] border-[#F97316]/40 hover:bg-[#F97316] hover:text-white hover:border-[#F97316] transition-colors"
          >
            Koç Girişi
          </Link>
          <Link
            href="/basvuru"
            className="hidden sm:inline-flex whitespace-nowrap bg-[#F97316] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#ea6c10] transition-colors shadow-md shadow-orange-500/20"
          >
            Ücretsiz İlk Ders
          </Link>

          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Menüyü aç"
                className="xl:hidden h-11 w-11 shrink-0 text-zinc-700"
              >
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0 bg-white">
              {/* Kapatma: SheetContent'in kendi × butonu (ikinci bir × yok). */}
              <div className="flex items-center px-5 h-16 border-b border-zinc-200">
                <Image
                  src="/images/logo.png"
                  alt="KoçUp Akademi"
                  width={165}
                  height={90}
                  className="object-contain h-11 w-auto"
                />
              </div>
              <div className="flex flex-col px-2 py-3">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="px-3 py-3 rounded-lg text-base font-medium text-zinc-700 hover:bg-zinc-50 hover:text-[#1B6B8A] transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="border-t border-zinc-200 px-4 py-4 space-y-2">
                <Link
                  href="/giris/ogrenci"
                  onClick={() => setOpen(false)}
                  className="block w-full text-center text-sm font-semibold text-[#1B6B8A] border border-zinc-200 px-4 py-3 rounded-full hover:bg-zinc-50 transition-colors"
                >
                  Öğrenci Girişi
                </Link>
                <Link
                  href="/giris/koc"
                  onClick={() => setOpen(false)}
                  className="block w-full text-center text-sm font-semibold text-[#F97316] border border-[#F97316]/40 px-4 py-3 rounded-full hover:bg-[#F97316] hover:text-white transition-colors"
                >
                  Koç Girişi
                </Link>
                <Link
                  href="/basvuru"
                  onClick={() => setOpen(false)}
                  className="block w-full text-center bg-[#1B6B8A] text-white text-sm font-semibold px-4 py-3 rounded-full hover:bg-[#155873] transition-colors"
                >
                  Ücretsiz İlk Ders
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  )
}
