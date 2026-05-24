import type { MetadataRoute } from "next"

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.kocupakedemi.com").replace(/\/$/, "")

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/koc/",
          "/mudur/",
          "/ogrenci/",
          "/auth/",
          "/api/",
          "/sifre-belirle",
          "/giris/mudur",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
