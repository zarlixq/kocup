import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Koç Başvurusu — KoçUp | Bireysel Koçlar İçin Panel",
  description:
    "Bireysel koç musun? KoçUp panelini kullanarak öğrencilerini profesyonelce yönet. Başvurunu bırak, sana dönelim.",
  alternates: { canonical: "/koc-basvuru" },
  openGraph: {
    title: "Koç Başvurusu — KoçUp",
    description:
      "Bireysel koç musun? KoçUp panelini kullanarak öğrencilerini profesyonelce yönet. Başvurunu bırak, sana dönelim.",
    url: "/koc-basvuru",
    type: "website",
  },
}

export default function KocBasvuruLayout({ children }: { children: React.ReactNode }) {
  return children
}
