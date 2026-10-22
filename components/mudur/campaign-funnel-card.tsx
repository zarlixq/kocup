import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { FunnelViewRow } from "@/lib/bireysel/funnel"
import { cn } from "@/lib/utils"

// Kampanya hunisi: /ucretsiz ziyareti → kayıt → UpPlan kurulumu → ilk soru kaydı.

function Rate({ v }: { v: number | null }) {
  return v === null ? null : <span className="ml-1 text-xs text-zinc-500">%{v}</span>
}

export function CampaignFunnelCard({ rows, total, sinceLabel }: { rows: FunnelViewRow[]; total: FunnelViewRow; sinceLabel: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-900">Kampanya hunisi (UTM kaynak × kampanya)</h3>
        <span className="text-xs text-zinc-500">{sinceLabel} · ziyaret = /ucretsiz tekil anonim oturum</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">Henüz veri yok.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kaynak</TableHead>
                <TableHead>Kampanya</TableHead>
                <TableHead className="text-right">Ziyaret</TableHead>
                <TableHead className="text-right">Kayıt</TableHead>
                <TableHead className="text-right">Kurulum</TableHead>
                <TableHead className="text-right">İlk soru</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...rows, total].map((r) => {
                const isTotal = r.key === "__total__"
                return (
                  <TableRow key={r.key} className={cn(isTotal && "border-t-2 bg-zinc-50 font-semibold")}>
                    <TableCell>{r.sourceLabel}</TableCell>
                    <TableCell className="text-zinc-600">{r.campaignLabel}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.visits}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.signups}
                      <Rate v={r.signupRate} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.setups}
                      <Rate v={r.setupRate} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.first_questions}
                      <Rate v={r.firstQuestionRate} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="mt-2 text-xs text-zinc-500">Kayıt oranı ziyarete, kurulum ve ilk soru oranı kayda göre.</p>
    </div>
  )
}
