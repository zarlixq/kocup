import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-6xl font-bold text-zinc-200 mb-4">404</h1>
      <h2 className="text-xl font-semibold text-zinc-900 mb-2">Sayfa Bulunamadı</h2>
      <p className="text-zinc-500 mb-6">Aradığın sayfa mevcut değil veya taşınmış olabilir.</p>
      <Link href="/" className="text-[#1B6B8A] font-medium hover:underline">
        Ana sayfaya dön
      </Link>
    </div>
  )
}
