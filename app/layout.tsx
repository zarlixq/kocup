import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans, Instrument_Serif } from "next/font/google"
import Script from "next/script"
import "./globals.css"
import { getSiteUrl } from "@/lib/site-url"

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
})

const instrument = Instrument_Serif({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument",
  weight: "400",
  style: ["normal", "italic"],
})

const siteUrl = getSiteUrl()
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

const description =
  "Sertifikalı eğitim koçları ile YKS hazırlığında bireysel takip, konu analizi, deneme yönlendirmesi. Türkiye'nin yenilikçi eğitim koçluğu platformu."

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "KoçUp Akademi — YKS Eğitim Koçluğu Platformu",
    template: "%s | KoçUp Akademi",
  },
  description,
  keywords: [
    "eğitim koçluğu",
    "YKS koçluğu",
    "TYT AYT hazırlık",
    "eğitim danışmanlığı",
    "öğrenci koçluğu",
    "LGS koçluğu",
    "MYK sertifikalı koç",
    "online koçluk",
  ],
  authors: [{ name: "KoçUp Akademi" }],
  creator: "KoçUp Akademi",
  publisher: "KoçUp Akademi",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "KoçUp Akademi — YKS Eğitim Koçluğu Platformu",
    description,
    type: "website",
    locale: "tr_TR",
    url: siteUrl,
    siteName: "KoçUp Akademi",
    // OG görseli app/opengraph-image.tsx ile dinamik üretiliyor
  },
  twitter: {
    card: "summary_large_image",
    title: "KoçUp Akademi — YKS Eğitim Koçluğu Platformu",
    description,
    // Twitter görseli app/twitter-image.tsx ile dinamik üretiliyor
  },
  alternates: {
    canonical: siteUrl,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
  // Not: app/icon.png ve app/apple-icon.png Next.js file convention'lar ile
  // otomatik algılanır. Aşağıdaki açık tanım ekstra güven ve sıralama içindir.
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
    shortcut: ["/icon.png"],
  },
}

export const viewport: Viewport = {
  themeColor: "#1B6B8A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${jakarta.variable} ${instrument.variable} scroll-smooth`}>
      <head>
        {supabaseUrl && (
          <link rel="preconnect" href={supabaseUrl} crossOrigin="anonymous" />
        )}

        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-18185085898"
          strategy="afterInteractive"
        />
        <Script id="google-ads-tag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', 'AW-18185085898');
          `}
        </Script>
      </head>

      <body className="antialiased font-sans">{children}</body>
    </html>
  )
}
