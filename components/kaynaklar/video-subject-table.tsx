import { formatSpan } from "@/lib/resources/video-match"
import type { SubjectVideoSummary } from "@/lib/resources/video-summary"

// Ders | İzlenen/Toplam | Kalan video | Kalan süre | Son izleme — öğrenci ve koç (salt okunur) ortak.
export function VideoSubjectTable({ rows }: { rows: SubjectVideoSummary[] }) {
  if (rows.length === 0) return null
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500">
            <th className="py-2 pr-3 font-medium">Ders</th>
            <th className="px-3 py-2 font-medium">İzlenen/Toplam</th>
            <th className="px-3 py-2 font-medium">Kalan video</th>
            <th className="px-3 py-2 font-medium">Kalan süre</th>
            <th className="py-2 pl-3 font-medium">Son izleme</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((r) => {
            const pct = r.total ? Math.round((r.watched / r.total) * 100) : 0
            return (
              <tr key={r.subject_id}>
                <td className="py-2 pr-3 font-medium text-zinc-900">{r.subject_name}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums">
                      {r.watched}/{r.total}
                    </span>
                    <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-zinc-100 sm:block">
                      <span className="block h-full rounded-full bg-[#F97316]" style={{ width: `${pct}%` }} />
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 tabular-nums">{r.remaining}</td>
                <td className="px-3 py-2 tabular-nums">
                  {r.remaining === 0 ? "—" : r.remainingUnknown === r.remaining ? "?" : `${formatSpan(r.remainingSeconds)}${r.remainingUnknown ? "+" : ""}`}
                </td>
                <td className="py-2 pl-3 tabular-nums text-zinc-600">
                  {r.lastWatchedAt ? new Date(r.lastWatchedAt).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" }) : "—"}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
