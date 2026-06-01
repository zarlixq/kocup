import { slugify } from "@/lib/slug"

export type HeadingItem = {
  id: string
  text: string
}

/**
 * Markdown içeriğinden H2 başlıkları çıkarır (## ile başlayan satırlar).
 * Code block (``` ile çevrili) ve indented code block (4+ boşluk) içlerini atlar.
 * Aynı slug birden fazla başlıkta çıkarsa "-2", "-3" eklenir.
 */
export function extractH2Headings(markdown: string): HeadingItem[] {
  if (!markdown) return []

  const lines = markdown.split(/\r?\n/)
  const headings: HeadingItem[] = []
  const seen = new Map<string, number>()
  let inFence = false

  for (const raw of lines) {
    const fenceMatch = raw.match(/^\s{0,3}(```|~~~)/)
    if (fenceMatch) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    const m = raw.match(/^##\s+(.+?)\s*#*\s*$/)
    if (!m) continue

    // Inline markdown (bold/italic/code/link) içeriğini düz metne indir
    const text = m[1]
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .trim()

    if (!text) continue

    const baseSlug = slugify(text) || "baslik"
    const count = seen.get(baseSlug) ?? 0
    const id = count === 0 ? baseSlug : `${baseSlug}-${count + 1}`
    seen.set(baseSlug, count + 1)

    headings.push({ id, text })
  }

  return headings
}
