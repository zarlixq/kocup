import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Öğrenci Girişi",
  description: "KoçUp Akademi öğrenci paneline giriş. Konularını, programını ve denemelerini takip et.",
  alternates: { canonical: "/giris/ogrenci" },
  robots: { index: true, follow: true },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
