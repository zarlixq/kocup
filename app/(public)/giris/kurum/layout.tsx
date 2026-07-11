import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Kurum Girişi",
  description: "KoçUp kurum yönetici paneline giriş. Koçlarını, öğrencilerini ve kurum ayarlarını yönet.",
  alternates: { canonical: "/giris/kurum" },
  robots: { index: true, follow: true },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
