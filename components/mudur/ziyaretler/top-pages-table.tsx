import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { EmptyChartCard } from "./empty-state"

const PATH_LABELS: Record<string, string> = {
  "/": "Ana Sayfa",
  "/basvuru": "Başvuru",
  "/araclar": "Araçlar Hub",
  "/araclar/net-hesaplama": "Net Hesaplama",
  "/araclar/geri-sayim": "Geri Sayım",
  "/araclar/pomodoro": "Pomodoro",
  "/araclar/tercih-rehberi": "Tercih Rehberi",
  "/blog": "Blog Listesi",
  "/giris/ogrenci": "Öğrenci Girişi",
  "/giris/koc": "Koç Girişi",
  "/giris/mudur": "Yönetici Girişi",
  "/sifremi-unuttum": "Şifremi Unuttum",
}

function labelFor(path: string): string {
  if (PATH_LABELS[path]) return PATH_LABELS[path]
  if (path.startsWith("/blog/kategori/")) {
    const slug = path.slice("/blog/kategori/".length)
    return `Blog kategori · ${slug}`
  }
  if (path.startsWith("/blog/")) {
    return "Blog yazısı"
  }
  if (path.startsWith("/koc")) return `Koç paneli · ${path.slice(4) || "/"}`
  if (path.startsWith("/ogrenci")) return `Öğrenci paneli · ${path.slice(8) || "/"}`
  if (path.startsWith("/mudur")) return `Yönetici paneli · ${path.slice(6) || "/"}`
  return path
}

export function TopPagesTable({
  rows,
}: {
  rows: { path: string; views: number; uniques: number }[]
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-bold text-zinc-900 mb-1">
        En Çok Ziyaret Edilen Sayfalar
      </h2>
      <p className="text-xs text-zinc-500 mb-4">İlk {Math.min(rows.length, 15)}</p>

      {rows.length === 0 ? (
        <EmptyChartCard label="Bu dönemde ziyaret yok" />
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-zinc-500 border-b border-zinc-100">
                <th className="text-left font-semibold pb-2 pl-4 sm:pl-0">Sayfa</th>
                <th className="text-right font-semibold pb-2 px-3">Ziyaret</th>
                <th className="text-right font-semibold pb-2 pr-4 sm:pr-0">Tekil</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.path} className="border-b border-zinc-50 last:border-b-0">
                  <td className="py-2.5 pl-4 sm:pl-0 min-w-0">
                    <Link
                      href={r.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-900 hover:text-[#1B6B8A] inline-flex items-center gap-1.5 group"
                    >
                      <span className="truncate max-w-[220px] sm:max-w-[320px]">
                        {labelFor(r.path)}
                      </span>
                      <ExternalLink
                        className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0"
                        aria-hidden="true"
                      />
                    </Link>
                    <div className="text-[11px] text-zinc-400 font-mono truncate max-w-[220px] sm:max-w-[320px]">
                      {r.path}
                    </div>
                  </td>
                  <td className="text-right tabular-nums text-zinc-700 px-3 align-top pt-2.5">
                    {r.views.toLocaleString("tr-TR")}
                  </td>
                  <td className="text-right tabular-nums text-zinc-500 pr-4 sm:pr-0 align-top pt-2.5">
                    {r.uniques.toLocaleString("tr-TR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
