import { BarChart3 } from "lucide-react"

export const metadata = { title: "Analitik — Kurum" }

export default function KurumAnalitikPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Analitik</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Kurum düzeyinde performans göstergeleri (yakında).
        </p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="h-6 w-6 text-zinc-500" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 mb-1">Çok yakında</h3>
        <p className="text-sm text-zinc-500 max-w-md mx-auto">
          Koç başına aktif öğrenci, hedef tamamlama oranları, kurum toplam soru
          çözümü trendleri burada görünecek.
        </p>
      </div>
    </div>
  )
}
