import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Yönetici Girişi",
  description: "KoçUp Akademi yönetici paneli girişi.",
  alternates: { canonical: "/giris/mudur" },
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
