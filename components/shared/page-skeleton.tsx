// Sayfa yüklenirken gösterilen jenerik skeleton. Her panel için
// route segment'ine `loading.tsx` ekleyerek kullanılır.
export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-6 animate-pulse motion-reduce:animate-none">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-md bg-zinc-200" />
        <div className="h-4 w-72 rounded-md bg-zinc-100" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-zinc-200 rounded-2xl p-5">
            <div className="h-4 w-20 rounded-md bg-zinc-100 mb-3" />
            <div className="h-8 w-16 rounded-md bg-zinc-200" />
          </div>
        ))}
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <div className="border-b border-zinc-100 p-4">
          <div className="h-5 w-40 rounded-md bg-zinc-200" />
        </div>
        <div className="divide-y divide-zinc-100">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="h-9 w-9 rounded-full bg-zinc-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded-md bg-zinc-200" />
                <div className="h-3 w-1/2 rounded-md bg-zinc-100" />
              </div>
              <div className="h-6 w-16 rounded-md bg-zinc-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
