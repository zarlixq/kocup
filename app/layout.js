import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: "KoçUp — Hedefine Çık",
  description:
    "Psikoloji uzmanı koçlarla YKS ve LGS'ye hazırlan. Sana özel program, haftalık takip ve gerçek sonuçlar.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />

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

      <body className="antialiased">{children}</body>
    </html>
  );
}