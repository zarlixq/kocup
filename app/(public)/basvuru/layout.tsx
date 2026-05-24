import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Başvuru Yap",
  description:
    "KoçUp Akademi öğrenci başvuru formu. Sertifikalı eğitim koçlarımızla YKS hazırlığına başlamak için ücretsiz tanışma seansı al.",
  alternates: { canonical: "/basvuru" },
  openGraph: {
    title: "Başvuru Yap | KoçUp Akademi",
    description: "Ücretsiz tanışma seansı için başvur. Sana uygun koçu eşleştirelim.",
    url: "/basvuru",
  },
}

export default function BasvuruLayout({ children }: { children: React.ReactNode }) {
  return children
}
