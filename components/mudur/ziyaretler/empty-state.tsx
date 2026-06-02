import { Sparkles } from "lucide-react"

export function EmptyChartCard({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 sm:py-12 px-4 bg-zinc-50/50 border border-dashed border-zinc-200 rounded-xl">
      <div className="w-10 h-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center mb-2.5">
        <Sparkles className="w-4 h-4 text-zinc-400" aria-hidden="true" />
      </div>
      <div className="text-sm text-zinc-500 max-w-xs">{label}</div>
    </div>
  )
}
