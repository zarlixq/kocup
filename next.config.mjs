/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turnstile site key'i (herkese açık) istemciye build anında aktarılır.
  // Secret yoksa boş → koruma kapalı (lib/security/turnstile.ts ile tutarlı).
  env: {
    NEXT_PUBLIC_TURNSTILE_SITE_KEY:
      process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET ? process.env.TURNSTILE_SITE_KEY : "",
  },
  // Geri bildirim ekran görüntüsü (≤4 MB) server action ile yüklenir.
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
  },
  // Eski yasal sayfa adresleri yeni adlara kalıcı yönlenir.
  async redirects() {
    return [
      { source: "/kvkk", destination: "/kvkk-aydinlatma", permanent: true },
      { source: "/kullanim-kosullari", destination: "/kullanim-sartlari", permanent: true },
    ]
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
}

export default nextConfig
