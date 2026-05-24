import Link from "next/link"
import { Plus, ChevronLeft, ChevronRight, Eye, FolderOpen } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const PAGE_SIZE = 10

const TR_DATE = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  draft: { label: "Taslak", cls: "bg-zinc-100 text-zinc-600" },
  published: { label: "Yayında", cls: "bg-emerald-100 text-emerald-700" },
  archived: { label: "Arşiv", cls: "bg-orange-100 text-orange-700" },
}

export default async function MudurBlogPage({
  searchParams,
}: {
  searchParams: Promise<{ sayfa?: string; durum?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.sayfa ?? "1", 10) || 1)
  const status = sp.durum && ["draft", "published", "archived"].includes(sp.durum) ? sp.durum : null

  const supabase = await createClient()

  let countQuery = supabase.from("blog_posts").select("*", { count: "exact", head: true })
  if (status) countQuery = countQuery.eq("status", status as "draft" | "published" | "archived")
  const { count } = await countQuery

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let listQuery = supabase
    .from("blog_posts")
    .select(
      "id, title, slug, status, published_at, updated_at, view_count, blog_categories(name)"
    )
    .order("updated_at", { ascending: false })
    .range(from, to)
  if (status) listQuery = listQuery.eq("status", status as "draft" | "published" | "archived")

  const { data: posts } = await listQuery

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  const filters = [
    { value: "", label: "Tümü" },
    { value: "published", label: "Yayında" },
    { value: "draft", label: "Taslak" },
    { value: "archived", label: "Arşiv" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900">Blog</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Toplam {count ?? 0} yazı.
            {status && ` (${STATUS_LABEL[status]?.label} filtresi aktif)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/mudur/blog/kategoriler">
            <Button variant="outline" size="sm">
              <FolderOpen className="w-4 h-4 mr-1.5" />
              Kategoriler
            </Button>
          </Link>
          <Link href="/mudur/blog/yeni">
            <Button size="sm" className="bg-[#1B6B8A] hover:bg-[#155873]">
              <Plus className="w-4 h-4 mr-1.5" />
              Yeni Yazı
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {filters.map((f) => (
          <Link
            key={f.value || "all"}
            href={f.value ? `/mudur/blog?durum=${f.value}` : "/mudur/blog"}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              (f.value || null) === status
                ? "bg-[#1B6B8A] text-white border-[#1B6B8A]"
                : "bg-white text-zinc-600 border-zinc-200 hover:border-[#1B6B8A]/40"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[260px]">Başlık</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">Görüntülenme</TableHead>
                <TableHead>Güncelleme</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(posts ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-zinc-400 py-10">
                    Henüz yazı yok. <Link href="/mudur/blog/yeni" className="text-[#1B6B8A] font-semibold hover:underline">Yeni yazı oluştur</Link>
                  </TableCell>
                </TableRow>
              ) : (
                (posts ?? []).map((p) => {
                  const st = STATUS_LABEL[p.status]
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link
                          href={`/mudur/blog/${p.id}/duzenle`}
                          className="font-semibold text-zinc-900 hover:text-[#1B6B8A] transition-colors line-clamp-2"
                        >
                          {p.title}
                        </Link>
                        <div className="text-xs text-zinc-400 font-mono mt-0.5 truncate max-w-[280px]">
                          /{p.slug}
                        </div>
                      </TableCell>
                      <TableCell>
                        {p.blog_categories?.name ? (
                          <span className="inline-block text-xs font-semibold text-[#F97316] bg-orange-50 px-2 py-0.5 rounded">
                            {p.blog_categories.name}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${st.cls}`}>
                          {st.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium text-zinc-700 tabular-nums">
                        {p.view_count.toLocaleString("tr-TR")}
                      </TableCell>
                      <TableCell className="text-xs text-zinc-500">
                        {TR_DATE.format(new Date(p.updated_at))}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          {p.status === "published" && (
                            <Link
                              href={`/blog/${p.slug}`}
                              target="_blank"
                              className="inline-flex items-center justify-center w-8 h-8 rounded text-zinc-500 hover:bg-zinc-100 hover:text-[#1B6B8A] transition-colors"
                              aria-label="Sitede görüntüle"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          )}
                          <Link
                            href={`/mudur/blog/${p.id}/duzenle`}
                            className="px-3 py-1.5 rounded text-xs font-semibold text-[#1B6B8A] hover:bg-[#1B6B8A]/5 transition-colors"
                          >
                            Düzenle
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-zinc-100">
            <Link
              href={status
                ? page > 1 ? `/mudur/blog?durum=${status}${page - 1 > 1 ? `&sayfa=${page - 1}` : ""}` : "#"
                : page > 1 ? `/mudur/blog${page - 1 > 1 ? `?sayfa=${page - 1}` : ""}` : "#"}
              aria-disabled={page <= 1}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                page > 1 ? "text-zinc-700 hover:bg-zinc-100" : "text-zinc-300 pointer-events-none"
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Önceki
            </Link>
            <span className="text-xs text-zinc-500 font-medium">
              Sayfa {page} / {totalPages}
            </span>
            <Link
              href={status
                ? page < totalPages ? `/mudur/blog?durum=${status}&sayfa=${page + 1}` : "#"
                : page < totalPages ? `/mudur/blog?sayfa=${page + 1}` : "#"}
              aria-disabled={page >= totalPages}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                page < totalPages ? "text-zinc-700 hover:bg-zinc-100" : "text-zinc-300 pointer-events-none"
              }`}
            >
              Sonraki
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
