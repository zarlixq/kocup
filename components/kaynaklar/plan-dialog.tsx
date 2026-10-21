"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PlanSettings, defaultPlanDraft, planPayload, type PlanDraft } from "@/components/kaynaklar/plan-settings"
import type { PlanContext } from "@/components/kaynaklar/video-add-dialog"
import { detectDayStructure, formatDateTr } from "@/lib/resources/playlist-plan"
import { playlistDisplayName, type PlaylistRow } from "@/lib/resources/videos"
import { setPlaylistPlan } from "@/app/ogrenci/kaynaklarim/video-actions"

/** Mevcut playlist için plan kur / düzenle / kaldır. İzlenmiş günler plana girmez. */
export function PlanDialog({
  playlist,
  planContext,
  onOpenChange,
}: {
  playlist: PlaylistRow
  planContext: PlanContext
  onOpenChange: (open: boolean) => void
}) {
  const videos = useMemo(() => playlist.videos.filter((v) => v.watch_status !== "izlendi"), [playlist.videos])
  const dayStructure = useMemo(() => detectDayStructure(playlist.videos.map((v) => v.title)), [playlist.videos])
  const [draft, setDraft] = useState<PlanDraft>(() => {
    const base = defaultPlanDraft({ ...planContext, dayStructure })
    const p = playlist.plan
    if (!p) return base
    return {
      ...base,
      mode: p.mode,
      videoCount: p.mode === "video" && p.amount ? p.amount : base.videoCount,
      minutes: p.mode === "dakika" && p.amount ? p.amount : base.minutes,
      // Plan yeniden kurulurken kalan videolar bugünden başlar.
      start: planContext.today,
      weekdays: p.weekdays,
    }
  })
  const [saving, startSave] = useTransition()

  function save(remove = false) {
    startSave(async () => {
      const res = await setPlaylistPlan(playlist.id, remove ? null : planPayload(draft))
      if (!res.success) return void toast.error(res.error ?? "Plan kaydedilemedi.")
      toast.success(remove || !res.data?.end ? "Plan kaldırıldı." : `Plan kaydedildi · bitiş ${formatDateTr(res.data.end)}.`)
      onOpenChange(false)
    })
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Çalışma planı</DialogTitle>
          <DialogDescription>
            {playlistDisplayName(playlist)} · kalan {videos.length} video. İzlediğin günler plana girmez.
          </DialogDescription>
        </DialogHeader>
        <PlanSettings value={draft} onChange={setDraft} videos={videos} dayStructure={dayStructure} availability={planContext.availability} />
        <DialogFooter className="gap-2 sm:justify-between">
          {playlist.plan ? (
            <Button variant="ghost" className="text-red-600" onClick={() => save(true)} disabled={saving}>
              Planı kaldır
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Vazgeç
            </Button>
            <Button variant="accent" onClick={() => save()} disabled={saving || (draft.enabled && draft.weekdays.length === 0)}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Kaydet
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
