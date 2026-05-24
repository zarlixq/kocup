import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Koç Girişi",
  description: "KoçUp Akademi koç paneline giriş. Öğrencilerini, programlarını ve denemelerini yönet.",
  alternates: { canonical: "/giris/koc" },
  robots: { index: true, follow: true },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
