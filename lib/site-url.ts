const DEFAULT_PRODUCTION_URL = "https://www.kocupakedemi.com"

export function getSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : DEFAULT_PRODUCTION_URL)
  return raw.replace(/\/$/, "")
}
