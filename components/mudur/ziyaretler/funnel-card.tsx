import { ArrowDown } from "lucide-react"
import { EmptyChartCard } from "./empty-state"

type FunnelData = {
  total_sessions: number
  tool_or_blog_sessions: number
  converted_sessions: number
}

function FunnelBar({
  label,
  value,
  pct,
  color,
  width,
}: {
  label: string
  value: number
  pct: number
  color: string
  width: number
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline text-sm mb-1.5 gap-2">
        <span className="text-zinc-700 truncate">{label}</span>
        <span className="text-zinc-500 tabular-nums shrink-0 text-xs">
          {value.toLocaleString("tr-TR")} · {pct}%
        </span>
      </div>
      <div
        className="h-3 bg-zinc-100 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ backgroundColor: color, width: `${width}%` }}
        />
      </div>
    </div>
  )
}

export function FunnelCard({ data }: { data: FunnelData }) {
  const total = data.total_sessions
  const engaged = data.tool_or_blog_sessions
  const converted = data.converted_sessions

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-bold text-zinc-900 mb-1">
        Araç & Blog → Başvuru
      </h2>
      <p className="text-xs text-zinc-500 mb-5">Dönüşüm hunisi (oturum bazlı)</p>

      {total === 0 ? (
        <EmptyChartCard label="Bu dönemde oturum yok" />
      ) : (
        <>
          <div className="space-y-2.5">
            <FunnelBar
              label="Toplam oturum"
              value={total}
              pct={100}
              color="#94a3b8"
              width={100}
            />
            <div className="flex justify-center text-zinc-300" aria-hidden="true">
              <ArrowDown className="w-4 h-4" />
            </div>
            <FunnelBar
              label="Araç veya blog görmüş"
              value={engaged}
              pct={total > 0 ? Math.round((engaged / total) * 100) : 0}
              color="#1B6B8A"
              width={total > 0 ? Math.max(2, (engaged / total) * 100) : 0}
            />
            <div className="flex justify-center text-zinc-300" aria-hidden="true">
              <ArrowDown className="w-4 h-4" />
            </div>
            <FunnelBar
              label="Başvuru sayfasına gitmiş"
              value={converted}
              pct={total > 0 ? Math.round((converted / total) * 100) : 0}
              color="#F97316"
              width={total > 0 ? Math.max(2, (converted / total) * 100) : 0}
            />
          </div>

          <div className="mt-5 pt-4 border-t border-zinc-100 grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
                Etkileşim → Başvuru
              </div>
              <div className="text-2xl font-extrabold text-[#1B6B8A] tabular-nums mt-0.5">
                {engaged > 0 ? Math.round((converted / engaged) * 100) : 0}%
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                {converted.toLocaleString("tr-TR")} / {engaged.toLocaleString("tr-TR")}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
                Toplam → Başvuru
              </div>
              <div className="text-2xl font-extrabold text-[#F97316] tabular-nums mt-0.5">
                {total > 0 ? Math.round((converted / total) * 100) : 0}%
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                {converted.toLocaleString("tr-TR")} / {total.toLocaleString("tr-TR")}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
