import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Şifremi Unuttum",
  description:
    "KoçUp Akademi hesabın için şifre sıfırlama bağlantısı al. E-postana güvenli bir sıfırlama linki göndereceğiz.",
  alternates: { canonical: "/sifremi-unuttum" },
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
