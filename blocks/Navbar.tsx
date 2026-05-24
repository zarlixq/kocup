"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Menu, X } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

const NAV_LINKS = [
  { href: "/#nasil-calisir", label: "Nasıl Çalışır" },
  { href: "/#hizmetler", label: "Hizmetler" },
  { href: "/#koclarimiz", label: "Koçlar" },
  { href: "/#fiyatlar", label: "Paketler" },
  { href: "/blog", label: "Blog" },
  { href: "/#sss", label: "SSS" },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        scrolled
          ? "bg-white/85 backdrop-blur-md border-b border-zinc-200/70 shadow-sm"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-5 md:px-8 lg:px-12 h-16 md:h-[4.5rem]">
        <Link href="/" className="flex items-center shrink-0">
          <Image
            src="/logo.png"
            alt="KoçUp Akademi"
            width={110}
            height={40}
            className="object-contain h-9 w-auto md:h-10"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-7">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                scrolled
                  ? "text-zinc-600 hover:text-[#1B6B8A]"
                  : "text-white/85 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <Link
            href="/giris/ogrenci"
            className={`hidden sm:inline-flex text-sm font-semibold px-3 py-2 rounded-full transition-colors ${
              scrolled
                ? "text-[#1B6B8A] hover:bg-[#1B6B8A]/5"
                : "text-white/90 hover:bg-white/10"
            }`}
          >
            Öğrenci Girişi
          </Link>
          <Link
            href="/giris/koc"
            className={`hidden md:inline-flex text-sm font-semibold border px-4 py-2 rounded-full transition-colors ${
              scrolled
                ? "text-[#F97316] border-[#F97316]/40 hover:bg-[#F97316] hover:text-white hover:border-[#F97316]"
                : "text-white border-white/30 hover:bg-white hover:text-[#0F1F28] hover:border-white"
            }`}
          >
            Koç Girişi
          </Link>
          <Link
            href="/basvuru"
            className="hidden sm:inline-flex bg-[#F97316] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#ea6c10] transition-colors shadow-md shadow-orange-500/20"
          >
            Hemen Başvur
          </Link>

          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Menüyü aç"
                className={`lg:hidden ${scrolled ? "text-zinc-700" : "text-white hover:bg-white/10"}`}
              >
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0 bg-white">
              <div className="flex items-center justify-between px-5 h-16 border-b border-zinc-200">
                <Image
                  src="/logo.png"
                  alt="KoçUp"
                  width={100}
                  height={36}
                  className="object-contain h-9 w-auto"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                  aria-label="Menüyü kapat"
                >
                  <X className="w-5 h-5" />
                </Button>
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
                  Hemen Başvur
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  )
}
