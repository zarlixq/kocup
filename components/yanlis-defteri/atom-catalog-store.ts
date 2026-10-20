"use client"

import { useSyncExternalStore } from "react"
import { indexAtoms, type IndexedAtom } from "@/lib/yanlis-defteri/atom-search"
import { getAtomCatalog } from "@/app/ogrenci/yanlis-defteri/actions"

// Ders grubu atom katalogları — ders başına BİR kez yüklenir (sayfa ömrü
// boyunca bellekte), arama istemcide. Yükleme yalnız kullanıcı olayıyla
// tetiklenir (arama kutusuna odak, "Hangi bilgi?", "Düzenle").

export type CatalogEntry =
  | { status: "loading" }
  | { status: "ready"; atoms: IndexedAtom[]; history: Record<string, number> }
  | { status: "error"; error: string }

const entries = new Map<string, CatalogEntry>()
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function loadAtomCatalog(subjectId: string) {
  const cur = entries.get(subjectId)
  if (cur && cur.status !== "error") return
  entries.set(subjectId, { status: "loading" })
  emit()
  getAtomCatalog(subjectId)
    .then((res) => {
      entries.set(
        subjectId,
        res.success && res.data
          ? { status: "ready", atoms: indexAtoms(res.data.atoms), history: res.data.history }
          : { status: "error", error: res.error ?? "Bilgi atomları yüklenemedi." },
      )
    })
    .catch(() => entries.set(subjectId, { status: "error", error: "Bilgi atomları yüklenemedi." }))
    .finally(emit)
}

/** Kayıttan sonra: geçmiş sayıları değişti, katalog bir sonraki açılışta tazelenir. */
export function forgetAtomCatalogs() {
  entries.clear()
}

export function useAtomCatalog(subjectId: string | null): CatalogEntry | null {
  return useSyncExternalStore(
    subscribe,
    () => (subjectId ? (entries.get(subjectId) ?? null) : null),
    () => null,
  )
}
