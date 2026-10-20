"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ImageIcon, MessageSquare } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyState } from "@/components/shared/empty-state"
import { formatDateTimeTr } from "@/lib/bireysel/format"
import { updateFeedbackStatus } from "@/app/mudur/geri-bildirimler/actions"

export type FeedbackItem = {
  id: string
  message: string
  page_path: string | null
  status: "yeni" | "incelendi" | "kapandi"
  created_at: string
  screenshot_url: string | null
  user_id: string
  user_name: string
  user_email: string
}

const STATUS_LABEL: Record<FeedbackItem["status"], string> = { yeni: "Yeni", incelendi: "İncelendi", kapandi: "Kapandı" }
const ALL = "__all__"

export function FeedbackListView({ items }: { items: FeedbackItem[] }) {
  const [filter, setFilter] = useState<string>(ALL)
  const [pending, start] = useTransition()
  const filtered = useMemo(() => items.filter((i) => filter === ALL || i.status === filter), [items, filter])
  const newCount = items.filter((i) => i.status === "yeni").length

  function changeStatus(id: string, status: string) {
    start(async () => {
      const res = await updateFeedbackStatus(id, status)
      if (!res.success) toast.error(res.error ?? "Güncellenemedi.")
    })
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Geri Bildirimler</h1>
          <p className="mt-1 text-sm text-zinc-500">{items.length} geri bildirim · {newCount} yeni</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tüm durumlar</SelectItem>
            {(Object.keys(STATUS_LABEL) as FeedbackItem["status"][]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Geri bildirim yok" description="Öğrencilerin gönderdiği geri bildirimler burada listelenir." />
      ) : (
        <ul className="space-y-3">
          {filtered.map((f) => (
            <li key={f.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/mudur/ogrenciler/${f.user_id}`} className="font-medium text-zinc-900 hover:underline">
                    {f.user_name}
                  </Link>
                  <div className="text-xs text-zinc-500">
                    {f.user_email} · {formatDateTimeTr(f.created_at)}
                    {f.page_path && <> · <span className="font-mono">{f.page_path}</span></>}
                  </div>
                </div>
                <Select value={f.status} onValueChange={(v) => changeStatus(f.id, v)} disabled={pending}>
                  <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_LABEL) as FeedbackItem["status"][]).map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-700">{f.message}</p>
              {f.screenshot_url && (
                <a href={f.screenshot_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm text-[#1B6B8A] hover:underline">
                  <ImageIcon className="h-4 w-4" /> Ekran görüntüsünü aç
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
