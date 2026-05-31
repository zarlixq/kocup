import Image from "next/image"
import Link from "next/link"
import { MessageCircle, Mail } from "lucide-react"

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.336 3.608 1.311.975.975 1.249 2.242 1.311 3.608.058 1.266.069 1.646.069 4.85s-.012 3.584-.07 4.85c-.062 1.366-.336 2.633-1.311 3.608-.975.975-2.242 1.249-3.608 1.311-1.266.058-1.646.069-4.85.069s-3.584-.012-4.85-.07c-1.366-.062-2.633-.336-3.608-1.311-.975-.975-1.249-2.242-1.311-3.608C2.175 15.747 2.163 15.367 2.163 12s.012-3.584.07-4.85c.062-1.366.336-2.633 1.311-3.608.975-.975 2.242-1.249 3.608-1.311C8.416 2.175 8.796 2.163 12 2.163zm0 1.838c-3.155 0-3.515.011-4.755.068-1.013.046-1.563.213-1.929.355-.483.187-.825.41-1.187.772-.362.362-.585.704-.772 1.187-.142.366-.309.916-.355 1.929-.057 1.24-.068 1.6-.068 4.755s.011 3.515.068 4.755c.046 1.013.213 1.563.355 1.929.187.483.41.825.772 1.187.362.362.704.585 1.187.772.366.142.916.309 1.929.355 1.24.057 1.6.068 4.755.068s3.515-.011 4.755-.068c1.013-.046 1.563-.213 1.929-.355.483-.187.825-.41 1.187-.772.362-.362.585-.704.772-1.187.142-.366.309-.916.355-1.929.057-1.24.068-1.6.068-4.755s-.011-3.515-.068-4.755c-.046-1.013-.213-1.563-.355-1.929-.187-.483-.41-.825-.772-1.187-.362-.362-.704-.585-1.187-.772-.366-.142-.916-.309-1.929-.355-1.24-.057-1.6-.068-4.755-.068zm0 3.131a4.868 4.868 0 110 9.736 4.868 4.868 0 010-9.736zm0 8.027a3.159 3.159 0 100-6.318 3.159 3.159 0 000 6.318zm6.193-8.215a1.137 1.137 0 11-2.275 0 1.137 1.137 0 012.275 0z" />
    </svg>
  )
}

function TwitterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  )
}

function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

const QUICK_LINKS = [
  { href: "/basvuru", label: "Başvuru" },
  { href: "/giris/ogrenci", label: "Öğrenci Girişi" },
  { href: "/giris/koc", label: "Koç Girişi" },
  { href: "/blog", label: "Blog" },
  { href: "/#sss", label: "SSS" },
]

const LEGAL_LINKS = [
  { href: "#", label: "Gizlilik Politikası" },
  { href: "#", label: "KVKK Aydınlatma Metni" },
  { href: "#", label: "Kullanım Şartları" },
  { href: "#", label: "Çerez Politikası" },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-[#0A1820] text-white px-5 md:px-8 lg:px-12 pt-16 pb-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10 pb-10 border-b border-white/10">
          {/* Hakkımızda */}
          <div className="col-span-2 md:col-span-1">
            <Image
              src="/images/logo.png"
              alt="KoçUp Akademi"
              width={120}
              height={42}
              className="object-contain h-10 w-auto mb-4 brightness-0 invert"
            />
            <p className="text-sm text-zinc-400 leading-relaxed mb-5 max-w-xs">
              Sertifikalı eğitim koçlarıyla YKS hazırlığını dijitalleştiren bütüncül koçluk platformu.
            </p>
            <div className="flex items-center gap-2">
              {[
                { Icon: InstagramIcon, href: "#", label: "Instagram" },
                { Icon: TwitterIcon, href: "#", label: "Twitter" },
                { Icon: LinkedinIcon, href: "#", label: "LinkedIn" },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-[#F97316] flex items-center justify-center transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Hızlı Linkler */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">Hızlı Linkler</h4>
            <ul className="space-y-2.5">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Yasal */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">Yasal</h4>
            <ul className="space-y-2.5">
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* İletişim */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">İletişim</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://wa.me/905333704391?text=Merhaba KoçUp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  <MessageCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#25D366]" />
                  <span>
                    <span className="block text-[10px] uppercase tracking-wider text-zinc-500">WhatsApp</span>
                    0533 370 43 91
                  </span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@kocupakedemi.com"
                  className="flex items-start gap-2.5 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  <Mail className="w-4 h-4 mt-0.5 shrink-0 text-[#F97316]" />
                  <span>
                    <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Email</span>
                    info@kocupakedemi.com
                  </span>
                </a>
              </li>
              <li className="text-sm text-zinc-400 pl-6">
                <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Saatler</span>
                09:00 — 21:00
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-zinc-500">
            © {year} KoçUp Akademi. Tüm hakları saklıdır.
          </p>
          <Link
            href="/giris/mudur"
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Yönetici Girişi
          </Link>
        </div>
      </div>
    </footer>
  )
}
