import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-[#0F1F28] px-6 md:px-12 lg:px-24 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-8 border-b border-white/10">

          {/* Logo & slogan */}
          <div>
            <Image
              src="/logo.png"
              alt="KoçUp"
              width={90}
              height={32}
              className="object-contain mb-3"
            />
            <p className="text-gray-500 text-sm">
              Psikoloji uzmanı koçlarla hedefine ulaş.
            </p>
          </div>

          {/* Linkler */}
          <div className="flex flex-wrap gap-6">
            {[
              { label: "Nasıl Çalışır", href: "#nasil-calisir" },
              { label: "Koçlarımız", href: "#koclarimiz" },
              { label: "Fiyatlar", href: "#fiyatlar" },
              { label: "SSS", href: "#sss" },
              { label: "Başvuru", href: "#basvuru" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
            <a
              href="/admin/giris"
              className="text-sm text-[#F97316] hover:text-orange-300 transition-colors font-semibold"
            >
              Koç Girişi
            </a>
          </div>
        </div>

        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} KoçUp. Tüm hakları saklıdır.
          </p>
          <p className="text-xs text-gray-500">
            Hedefine birlikte ulaşalım.
          </p>
        </div>
      </div>
    </footer>
  );
}