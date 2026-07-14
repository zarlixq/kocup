"use client"

import { useState, useTransition } from "react"
import {
  CalendarPlus,
  Check,
  X as XIcon,
  CalendarClock,
  Ban,
  Pencil,
  CornerDownRight,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DemoStatusBadge } from "@/components/mudur/satis-takibi/demo-status-badge"
import { SetterSelect, type SetterOption } from "@/components/mudur/satis-takibi/setter-select"
import { DemoScheduleDialog } from "@/components/mudur/satis-takibi/demo-schedule-dialog"
import {
  formatDemoDateTime,
  embeddedName,
  DEMO_OUTCOME_OPTIONS,
  DEMO_OUTCOME_LABEL,
  type DemoAppointmentWithSetter,
  type DemoStatus,
  type DemoOutcome,
} from "@/lib/satis-takibi"
import {
  markDemoResult,
  updateDemoNotes,
  cancelDemoAppointment,
  setDemoAppointmentSetter,
} from "@/app/mudur/satis-takibi/actions"

const NONE = "__none__"

export function DemoAppointmentsPanel({
  leadId,
  appointments,
  setters,
}: {
  leadId: string
  appointments: DemoAppointmentWithSetter[]
  setters: SetterOption[]
}) {
  const [scheduleFor, setScheduleFor] = useState<
    { mode: "create" } | { mode: "reschedule"; from: DemoAppointmentWithSetter } | null
  >(null)
  const [resultFor, setResultFor] = useState<DemoAppointmentWithSetter | null>(null)
  const [cancelFor, setCancelFor] = useState<DemoAppointmentWithSetter | null>(null)

  const hasUpcoming = appointments.some((a) => a.status === "scheduled")

  return (
    <section className="bg-white border border-zinc-200 rounded-2xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <CalendarClock className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-semibold text-zinc-900">Demo Randevuları</h2>
            <p className="text-xs text-zinc-500">
              {appointments.length} randevu{hasUpcoming ? " · yaklaşan var" : ""}
            </p>
          </div>
        </div>
        <Button className="bg-[#1B6B8A] hover:bg-[#155a75]" onClick={() => setScheduleFor({ mode: "create" })}>
          <CalendarPlus className="h-4 w-4 mr-1" /> Demo Randevusu Oluştur
        </Button>
      </div>

      {appointments.length === 0 ? (
        <div className="p-8 text-center text-sm text-zinc-500">
          Henüz demo randevusu yok. Yukarıdaki butondan ilk randevuyu oluşturun.
        </div>
      ) : (
        <ol className="p-4 space-y-3">
          {appointments.map((a) => (
            <DemoCard
              key={a.id}
              appt={a}
              setters={setters}
              onResult={() => setResultFor(a)}
              onReschedule={() => setScheduleFor({ mode: "reschedule", from: a })}
              onCancel={() => setCancelFor(a)}
            />
          ))}
        </ol>
      )}

      {scheduleFor && (
        <DemoScheduleDialog
          target={
            scheduleFor.mode === "reschedule"
              ? {
                  mode: "reschedule",
                  appointmentId: scheduleFor.from.id,
                  defaultSetterId: scheduleFor.from.set_by_id,
                }
              : { mode: "create", leadId }
          }
          setters={setters}
          onClose={() => setScheduleFor(null)}
        />
      )}
      {resultFor && <ResultDialog appt={resultFor} onClose={() => setResultFor(null)} />}
      {cancelFor && <CancelDialog appt={cancelFor} onClose={() => setCancelFor(null)} />}
    </section>
  )
}

// ── Tek randevu kartı ────────────────────────────────────────────────────
function DemoCard({
  appt,
  setters,
  onResult,
  onReschedule,
  onCancel,
}: {
  appt: DemoAppointmentWithSetter
  setters: SetterOption[]
  onResult: () => void
  onReschedule: () => void
  onCancel: () => void
}) {
  const status = appt.status as DemoStatus
  const [isPending, startTransition] = useTransition()
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState(appt.notes ?? "")
  const setterName = embeddedName(appt.setter)
  // Ayarlayan soft-inactive olsa bile geçmiş adı seçicide görünsün diye listeye ekle.
  const cardSetters =
    appt.set_by_id && setterName && !setters.some((s) => s.id === appt.set_by_id)
      ? [...setters, { id: appt.set_by_id, name: setterName }]
      : setters

  function changeSetter(setterId: string | null) {
    startTransition(async () => {
      const res = await setDemoAppointmentSetter(appt.id, setterId)
      if (res.success) toast.success("Ayarlayan güncellendi.")
      else toast.error(res.error ?? "Güncellenemedi.")
    })
  }

  function saveNotes() {
    startTransition(async () => {
      const res = await updateDemoNotes(appt.id, notes)
      if (res.success) {
        toast.success("Not kaydedildi.")
        setEditingNotes(false)
      } else {
        toast.error(res.error ?? "Kaydedilemedi.")
      }
    })
  }

  function quickNoShow() {
    startTransition(async () => {
      const res = await markDemoResult(appt.id, { showed_up: false })
      if (res.success) toast.success("Gelmedi olarak işaretlendi.")
      else toast.error(res.error ?? "İşlem başarısız.")
    })
  }

  return (
    <li className="rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-zinc-900 tabular-nums">
              {formatDemoDateTime(appt.scheduled_at)}
            </span>
            <DemoStatusBadge status={status} />
            {appt.status === "completed" && appt.outcome && (
              <span className="text-xs rounded-full bg-zinc-100 text-zinc-700 px-2 py-0.5">
                {DEMO_OUTCOME_LABEL[appt.outcome as DemoOutcome] ?? appt.outcome}
              </span>
            )}
          </div>
          {appt.rescheduled_from_id && (
            <div className="flex items-center gap-1 text-[11px] text-amber-700 mt-1">
              <CornerDownRight className="h-3 w-3" />
              Önceki gelmedi randevusundan ertelendi
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {status === "scheduled" && (
            <>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8" onClick={onResult}>
                <Check className="h-3.5 w-3.5 mr-1" /> Geldi
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-red-600 border-red-200 hover:bg-red-50"
                onClick={quickNoShow}
                disabled={isPending}
              >
                <XIcon className="h-3.5 w-3.5 mr-1" /> Gelmedi
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-zinc-500"
                onClick={onCancel}
                title="İptal et"
              >
                <Ban className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          {status === "no_show" && (
            <Button size="sm" variant="accent" className="h-8" onClick={onReschedule}>
              <CalendarClock className="h-3.5 w-3.5 mr-1" /> Yeni Randevu Belirle
            </Button>
          )}
        </div>
      </div>

      {/* Ayarlayan (kim bağladı) — inline değiştirilebilir */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-zinc-500">Ayarlayan:</span>
        <div className="w-48">
          <SetterSelect
            setters={cardSetters}
            value={appt.set_by_id}
            onChange={(id) => changeSetter(id)}
            size="sm"
          />
        </div>
      </div>

      {/* Not alanı — her zaman düzenlenebilir */}
      <div className="mt-3">
        {editingNotes ? (
          <div className="space-y-2">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Görüşme notu..."
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={saveNotes} disabled={isPending} className="bg-[#1B6B8A] hover:bg-[#155a75]">
                {isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setNotes(appt.notes ?? "")
                  setEditingNotes(false)
                }}
              >
                Vazgeç
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingNotes(true)}
            className="group flex items-start gap-2 text-left w-full rounded-lg px-2 py-1.5 hover:bg-zinc-50 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5 text-zinc-400 mt-0.5 shrink-0" />
            <span className={appt.notes ? "text-sm text-zinc-700 whitespace-pre-line" : "text-sm text-zinc-400"}>
              {appt.notes || "Not ekle..."}
            </span>
          </button>
        )}
      </div>
    </li>
  )
}

// ── "Geldi" sonuç dialog (outcome + not) ─────────────────────────────────
function ResultDialog({ appt, onClose }: { appt: DemoAppointmentWithSetter; onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [outcome, setOutcome] = useState<string>(appt.outcome ?? NONE)
  const [notes, setNotes] = useState(appt.notes ?? "")

  function submit() {
    startTransition(async () => {
      const res = await markDemoResult(appt.id, {
        showed_up: true,
        outcome: outcome === NONE ? null : (outcome as DemoOutcome),
        notes,
      })
      if (res.success) {
        toast.success("Demo tamamlandı olarak işaretlendi.")
        onClose()
      } else {
        toast.error(res.error ?? "İşlem başarısız.")
      }
    })
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Demo Tamamlandı</DialogTitle>
          <DialogDescription>
            {formatDemoDateTime(appt.scheduled_at)} — görüşme sonucunu kaydedin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Görüşme Sonucu (opsiyonel)</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger>
                <SelectValue placeholder="Seçilmedi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Belirtilmedi</SelectItem>
                {DEMO_OUTCOME_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="result-notes">Not (opsiyonel)</Label>
            <Textarea
              id="result-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Görüşmede konuşulanlar..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Vazgeç
          </Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={submit} disabled={isPending}>
            {isPending ? "Kaydediliyor..." : "Tamamlandı Olarak İşaretle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── İptal onayı ──────────────────────────────────────────────────────────
function CancelDialog({ appt, onClose }: { appt: DemoAppointmentWithSetter; onClose: () => void }) {
  const [isPending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      const res = await cancelDemoAppointment(appt.id)
      if (res.success) {
        toast.success("Randevu iptal edildi.")
        onClose()
      } else {
        toast.error(res.error ?? "İptal edilemedi.")
      }
    })
  }

  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Randevuyu iptal et?</AlertDialogTitle>
          <AlertDialogDescription>
            {formatDemoDateTime(appt.scheduled_at)} tarihli randevu iptal edilecek. Kayıt silinmez,
            geçmişte kalır.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Vazgeç</AlertDialogCancel>
          <AlertDialogAction onClick={submit} disabled={isPending} className="bg-red-600 hover:bg-red-700">
            {isPending ? "İptal ediliyor..." : "Evet, iptal et"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
