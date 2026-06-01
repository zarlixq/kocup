import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/site-url"

const baseUrl = getSiteUrl()

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
          "/kurum/",
          "/auth/",
          "/api/",
          "/sifre-belirle",
          "/sifremi-unuttum",
          "/giris/mudur",
          "/*?paket=*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
