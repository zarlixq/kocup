"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { HelpCircle, Loader2, Minus, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { ATOM_CHIP_LIMIT } from "@/lib/yanlis-defteri/constants"
import { orderAtoms } from "@/lib/yanlis-defteri/panel-logic"
import { indexAtoms, searchAtoms, type IndexedAtom } from "@/lib/yanlis-defteri/atom-search"
import type { AtomCatalog } from "@/lib/yanlis-defteri/load"
import { loadAtomCatalog, useAtomCatalog, type CatalogEntry } from "@/components/yanlis-defteri/atom-catalog-store"

const SEARCH_DEBOUNCE_MS = 150
const RESULT_LIMIT = 40

// Bilgi atomu seçici — soru kaydı paneli, deneme dağıtımı ve yanlış
// düzenleme AYNI bileşeni kullanır.
//   Arama boş: seçili konunun atomları chip olarak (geçmişte çok seçilen önce);
//              başka konudan seçilmiş atomlar da konu etiketiyle başta durur.
//   Arama dolu: ders grubunun (TYT+AYT aynı alan) TÜM aktif konularında arar,
//               sonuçta atomun konusu etiketle görünür (bkz. lib/yanlis-defteri/atom-search.ts).
// Sayı modu (varsayılan): her basış +1, havuz doluysa eklenmez.
// Tekli mod (single): bir atom seçilir; "Emin değilim" seçimi kaldırır.
export function AtomPicker({
  subjectId,
  topicId,
  counts,
  onAdd,
  onRemove,
  canAdd,
  single = false,
  unsureCount,
  initialCatalog,
}: {
  subjectId: string
  topicId: string | null
  /** Atom id → bu kayıtta seçilme sayısı (tekli modda 0/1). */
  counts: Record<string, number>
  onAdd: (atomId: string, atomName: string) => void
  onRemove: (atomId: string) => void
  canAdd: boolean
  single?: boolean
  /** Sayı modunda atanmamış "bilmiyordum" yanlışı (Emin değilim ×n). */
  unsureCount?: number
  /** Sunucunun zaten yüklediği katalog (soru kaydı paneli). */
  initialCatalog?: AtomCatalog
}) {
  const entry = useAtomCatalog(subjectId)
  const initial = useMemo<CatalogEntry | null>(
    () => (initialCatalog ? { status: "ready", atoms: indexAtoms(initialCatalog.atoms), history: initialCatalog.history } : null),
    [initialCatalog],
  )
  const catalog = entry?.status === "ready" ? entry : (initial ?? entry)

  const [query, setQuery] = useState("")
  const [debounced, setDebounced] = useState("")
  const [showAll, setShowAll] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [query])

  const ready = catalog?.status === "ready" ? catalog : null
  const history = useMemo(() => ready?.history ?? {}, [ready])
  const byId = useMemo(() => new Map((ready?.atoms ?? []).map((a) => [a.id, a])), [ready])
  const topicAtoms = useMemo(
    () => orderAtoms((ready?.atoms ?? []).filter((a) => a.topic_id === topicId), history),
    [ready, topicId, history],
  )
  const results = useMemo(
    () => (ready && debounced.trim() ? searchAtoms(ready.atoms, debounced, { topicId, history, limit: RESULT_LIMIT + 1 }) : []),
    [ready, debounced, topicId, history],
  )

  // Seçili olup konunun dışında kalan atomlar (çapraz) — arama boşken de görünür.
  const selectedElsewhere = Object.keys(counts)
    .filter((id) => (counts[id] ?? 0) > 0)
    .map((id) => byId.get(id))
    .filter((a): a is IndexedAtom => !!a && a.topic_id !== topicId)
  const visibleTopicAtoms = showAll ? topicAtoms : topicAtoms.slice(0, ATOM_CHIP_LIMIT)
  const searching = debounced.trim().length > 0

  function onFocus() {
    loadAtomCatalog(subjectId)
    // Mobil: klavye açılınca arama kutusu ekranın üstüne gelsin, sonuçlar altında görünür kalsın.
    setTimeout(() => inputRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 300)
  }

  function pick(id: string, name: string) {
    onAdd(id, name)
    if (single) {
      setQuery("")
      setDebounced("")
    }
  }

  if (ready && ready.atoms.length === 0) {
    return (
      <p className="text-xs text-zinc-500">
        Bu dersin bilgi atomları henüz eklenmedi. Yanlışların &quot;emin değilim&quot; olarak kaydedilir; atomlar eklenince
        yanlış defterinden atayabilirsin.
      </p>
    )
  }

  const selectedId = single ? Object.keys(counts).find((id) => (counts[id] ?? 0) > 0) ?? null : null

  return (
    <div className="space-y-2">
      <div className="relative scroll-mt-4">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={onFocus}
          placeholder="Bilgi ara (ör. asal, türev)…"
          aria-label="Bilgi atomu ara"
          className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-8 pr-8 text-base text-zinc-900 placeholder:text-zinc-400 focus-visible:border-[#1B6B8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B6B8A] sm:text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("")
              setDebounced("")
              inputRef.current?.focus()
            }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-zinc-700"
            aria-label="Aramayı temizle"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {catalog?.status === "error" && <p className="text-xs text-red-600">{catalog.error}</p>}

      {searching ? (
        !ready ? (
          <Loading />
        ) : results.length === 0 ? (
          <p className="px-1 py-2 text-xs text-zinc-500">&quot;{debounced.trim()}&quot; için bilgi bulunamadı.</p>
        ) : (
          <ul className="max-h-[45vh] divide-y divide-zinc-100 overflow-y-auto overscroll-contain rounded-lg border border-zinc-200 bg-white sm:max-h-72">
            {results.slice(0, RESULT_LIMIT).map(({ atom }) => (
              <ResultRow
                key={atom.id}
                atom={atom}
                n={counts[atom.id] ?? 0}
                past={history[atom.id] ?? 0}
                otherTopic={atom.topic_id !== topicId}
                disabled={!single && !canAdd && (counts[atom.id] ?? 0) === 0}
                single={single}
                onAdd={() => pick(atom.id, atom.name)}
                onRemove={() => onRemove(atom.id)}
              />
            ))}
            {results.length > RESULT_LIMIT && (
              <li className="px-3 py-2 text-[11px] text-zinc-500">Daha fazla sonuç var; aramayı daralt.</li>
            )}
          </ul>
        )
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {selectedElsewhere.map((a) => (
              <Chip
                key={a.id}
                atom={a}
                n={counts[a.id] ?? 0}
                past={0}
                topicLabel={a.topic_name}
                disabled={false}
                single={single}
                onAdd={() => pick(a.id, a.name)}
                onRemove={() => onRemove(a.id)}
              />
            ))}
            {visibleTopicAtoms.map((a) => (
              <Chip
                key={a.id}
                atom={a}
                n={counts[a.id] ?? 0}
                past={history[a.id] ?? 0}
                disabled={!single && !canAdd && (counts[a.id] ?? 0) === 0}
                single={single}
                onAdd={() => pick(a.id, a.name)}
                onRemove={() => onRemove(a.id)}
              />
            ))}
            {single ? (
              <button
                type="button"
                onClick={() => selectedId && onRemove(selectedId)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1.5 text-xs",
                  selectedId ? "border-zinc-300 bg-white text-zinc-500 hover:bg-zinc-50" : "border-zinc-400 bg-zinc-100 font-medium text-zinc-700",
                )}
              >
                <HelpCircle className="h-3 w-3" /> Emin değilim
              </button>
            ) : (
              unsureCount !== undefined && (
                <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-zinc-300 bg-white px-2.5 py-1.5 text-xs text-zinc-500">
                  <HelpCircle className="h-3 w-3" /> Emin değilim
                  {unsureCount > 0 && <span className="tabular-nums">×{unsureCount}</span>}
                </span>
              )
            )}
          </div>
          {!catalog ? null : !ready ? (
            <Loading />
          ) : topicAtoms.length === 0 ? (
            <p className="text-xs text-zinc-500">Bu konunun bilgi atomları henüz yok; dersin diğer konularında arayabilirsin.</p>
          ) : (
            topicAtoms.length > ATOM_CHIP_LIMIT && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="text-xs font-medium text-[#1B6B8A] hover:underline"
              >
                {showAll ? "Daha az göster" : `Bu konunun tümünü göster (${topicAtoms.length})`}
              </button>
            )
          )}
        </>
      )}
    </div>
  )
}

function Loading() {
  return (
    <div className="flex items-center gap-2 py-2 text-xs text-zinc-500">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Bilgi atomları yükleniyor…
    </div>
  )
}

type ItemProps = {
  atom: IndexedAtom
  n: number
  past: number
  disabled: boolean
  single: boolean
  onAdd: () => void
  onRemove: () => void
}

function Chip({ atom, n, past, topicLabel, disabled, single, onAdd, onRemove }: ItemProps & { topicLabel?: string }) {
  return (
    <span className="inline-flex max-w-full items-stretch overflow-hidden rounded-full border bg-white text-xs">
      <button
        type="button"
        title={atom.description ?? undefined}
        onClick={onAdd}
        disabled={disabled}
        className={cn(
          "min-w-0 px-2.5 py-1.5 text-left transition-colors disabled:opacity-50",
          n > 0 ? "bg-[#F97316] font-medium text-white" : "text-zinc-700 hover:bg-orange-50",
        )}
      >
        {atom.name}
        {topicLabel && (
          <span className={cn("ml-1 text-[10px]", n > 0 ? "text-orange-100" : "text-zinc-400")}>· {topicLabel}</span>
        )}
        {n > 0 && !single && <span className="ml-1 tabular-nums">×{n}</span>}
        {n === 0 && past > 0 && <span className="ml-1 text-[10px] text-orange-600">· {past} önceki</span>}
      </button>
      {n > 0 && (
        <button
          type="button"
          onClick={onRemove}
          className="border-l border-orange-300 bg-[#F97316] px-1.5 text-white hover:bg-orange-600"
          aria-label={single ? `${atom.name} seçimini kaldır` : `${atom.name} sayısını azalt`}
        >
          {single ? <X className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
        </button>
      )}
    </span>
  )
}

function ResultRow({ atom, n, past, otherTopic, disabled, single, onAdd, onRemove }: ItemProps & { otherTopic: boolean }) {
  return (
    <li className={cn("flex items-stretch", n > 0 && "bg-orange-50")}>
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        className="flex min-w-0 flex-1 flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-orange-50 disabled:opacity-50"
      >
        <span className="flex w-full flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <span className={cn("text-sm", n > 0 ? "font-semibold text-[#C2410C]" : "text-zinc-900")}>{atom.name}</span>
          {n > 0 && !single && <span className="text-xs font-semibold tabular-nums text-[#C2410C]">×{n}</span>}
          <span
            className={cn(
              "rounded-full px-1.5 py-px text-[10px] font-medium",
              otherTopic ? "bg-sky-50 text-sky-700" : "bg-zinc-100 text-zinc-600",
            )}
          >
            {atom.topic_name}
          </span>
          {past > 0 && <span className="text-[10px] text-orange-600">{past} önceki</span>}
        </span>
        {atom.description && <span className="line-clamp-1 text-[11px] text-zinc-500">{atom.description}</span>}
      </button>
      {n > 0 && (
        <button
          type="button"
          onClick={onRemove}
          className="border-l border-orange-200 px-3 text-[#C2410C] hover:bg-orange-100"
          aria-label={single ? `${atom.name} seçimini kaldır` : `${atom.name} sayısını azalt`}
        >
          {single ? <X className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
        </button>
      )}
    </li>
  )
}
