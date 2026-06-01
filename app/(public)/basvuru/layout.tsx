import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Ücretsiz Tanışma Seansı — Koçluk Başvuru Formu",
  description:
    "YKS veya LGS koçluğu için başvurunu yap, sana en uygun MYK belgeli koçu eşleştirelim. İlk tanışma seansı ücretsiz, hiçbir ön ödeme yok.",
  keywords: [
    "koçluk başvuru",
    "ücretsiz tanışma seansı",
    "YKS koçluğu başvuru",
    "LGS koçluğu başvuru",
    "eğitim koçu eşleştirme",
  ],
  alternates: { canonical: "/basvuru" },
  openGraph: {
    title: "Ücretsiz Tanışma Seansı — KoçUp Akademi",
    description: "Başvurunu yap, sana en uygun koçu eşleştirelim. İlk seans ücretsiz.",
    url: "/basvuru",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ücretsiz Tanışma Seansı — KoçUp Akademi",
    description: "Başvurunu yap, sana en uygun koçu eşleştirelim. İlk seans ücretsiz.",
  },
}

export default function BasvuruLayout({ children }: { children: React.ReactNode }) {
  return children
}
