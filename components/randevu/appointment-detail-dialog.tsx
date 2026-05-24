"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  CalendarIcon,
  Loader2,
  Repeat,
  StickyNote,
  Trash2,
  Video,
  XCircle,
  CheckCircle2,
  UserMinus,
  Pencil,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_TYPE_COLOR,
  APPOINTMENT_TYPE_LABEL,
  RECURRENCE_LABEL,
  type AppointmentStatus,
  type AppointmentType,
} from "@/lib/appointments/constants"
import {
  cancelAppointment,
  deleteAppointment,
  markCompleted,
  updateAppointment,
} from "@/app/koc/randevular/actions"
import { AppointmentFormDialog } from "@/components/randevu/appointment-form-dialog"

type Student = { id: string; full_name: string }

export type DetailAppointment = {
  id: string
  title: string
  type: AppointmentType
  status: AppointmentStatus
  start_time: string
  end_time: string
  meeting_link: string | null
  notes: string | null
  summary: string | null
  student_id: string | null
  parent_appointment_id: string | null
  is_recurring: boolean
  recurrence_rule: string | null
  recurrence_end_date: string | null
  studentName?: string | null
  applicationName?: string | null
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function AppointmentDetailDialog({
  open,
  onOpenChange,
  appointment,
  students,
  canManage,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment: DetailAppointment
  students: Student[]
  canManage: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [summary, setSummary] = useState(appointment.summary ?? "")
  const [completingMode, setCompletingMode] = useState(false)
  const [editing, setEditing] = useState(false)
  const [scope, setScope] = useState<"one" | "series">("one")

  const isPartOfSeries =
    appointment.is_recurring || appointment.parent_appointment_id !== null

  const colors = APPOINTMENT_TYPE_COLOR[appointment.type]

  function handleComplete() {
    startTransition(async () => {
      const res = await markCompleted(appointment.id, summary || undefined)
      if (!res.success) {
        toast.error(res.error ?? "İşaretlenemedi")
        return
      }
      toast.success("✅ Tamamlandı olarak işaretlendi")
      onOpenChange(false)
    })
  }

  function handleNoShow() {
    startTransition(async () => {
      const res = await updateAppointment({ id: appointment.id, status: "gelmedi" })
      if (!res.success) {
        toast.error(res.error ?? "İşaretlenemedi")
        return
      }
      toast.success("Gelmedi olarak işaretlendi")
      onOpenChange(false)
    })
  }

  function handleCancel() {
    startTransition(async () => {
      const res = await cancelAppointment(appointment.id, scope)
      if (!res.success) {
        toast.error(res.error ?? "İptal edilemedi")
        return
      }
      toast.success("Randevu iptal edildi")
      onOpenChange(false)
    })
  }

  function handleDelete() {
    if (!confirm(scope === "series" ? "Tüm seri silinsin mi?" : "Bu randevu silinsin mi?")) return
    startTransition(async () => {
      const res = await deleteAppointment(appointment.id, scope)
      if (!res.success) {
        toast.error(res.error ?? "Silinemedi")
        return
      }
      toast.success("🗑️ Silindi")
      onOpenChange(false)
    })
  }

  return (
    <>
      <Dialog open={open && !editing} onOpenChange={(o) => !pending && onOpenChange(o)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-start gap-3">
              <span className={`w-2 h-6 rounded ${colors.dot} mt-1 shrink-0`} />
              <span className="flex-1">{appointment.title}</span>
            </DialogTitle>
            <DialogDescription>
              <span
                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}
              >
                {APPOINTMENT_TYPE_LABEL[appointment.type]}
              </span>
              <span className="ml-2 text-xs text-zinc-500">
                Durum: {APPOINTMENT_STATUS_LABEL[appointment.status]}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <Row icon={<CalendarIcon className="h-4 w-4" />}>
              <span className="text-zinc-900 font-medium">
                {formatDateTime(appointment.start_time)}
              </span>
              <span className="text-zinc-500">
                {" "}
                — {formatTime(appointment.end_time)}
              </span>
            </Row>

            {(appointment.studentName || appointment.applicationName) && (
              <Row label="Kişi">
                <span className="text-zinc-900">
                  {appointment.studentName ?? appointment.applicationName}
                  {appointment.applicationName && !appointment.studentName && (
                    <span className="ml-1 text-xs text-zinc-500">(Tanıtım)</span>
                  )}
                </span>
              </Row>
            )}

            {isPartOfSeries && (
              <Row icon={<Repeat className="h-4 w-4" />}>
                <span className="text-zinc-700">
                  {appointment.recurrence_rule
                    ? RECURRENCE_LABEL[appointment.recurrence_rule]
                    : "Tekrarlanan seri"}
                  {appointment.recurrence_end_date && (
                    <span className="text-zinc-500">
                      {" "}
                      · {new Date(appointment.recurrence_end_date).toLocaleDateString("tr-TR")} tarihine kadar
                    </span>
                  )}
                </span>
              </Row>
            )}

            {appointment.meeting_link && (
              <a
                href={appointment.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-white bg-[#1B6B8A] hover:bg-[#155571] px-3 py-2 rounded-lg transition-colors"
              >
                <Video className="h-4 w-4" /> Görüşmeye Katıl
              </a>
            )}

            {appointment.notes && (
              <Row icon={<StickyNote className="h-4 w-4" />} label="Not">
                <span className="text-zinc-700 whitespace-pre-line">{appointment.notes}</span>
              </Row>
            )}

            {appointment.summary && (
              <Row label="Özet">
                <span className="text-zinc-700 whitespace-pre-line">{appointment.summary}</span>
              </Row>
            )}

            {canManage && completingMode && (
              <div className="space-y-2 pt-2 border-t border-zinc-100">
                <label className="text-xs text-zinc-500">Görüşme özeti (opsiyonel)</label>
                <Textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={3}
                  placeholder="Konuştuklarınız, kararlar..."
                />
              </div>
            )}

            {canManage && isPartOfSeries && (
              <div className="pt-2 border-t border-zinc-100 space-y-1.5">
                <label className="text-xs text-zinc-500">İşlem kapsamı</label>
                <Select value={scope} onValueChange={(v) => setScope(v as "one" | "series")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one">Sadece bu randevu</SelectItem>
                    <SelectItem value="series">Tüm seri</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {canManage && (
            <DialogFooter className="flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={pending}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" /> Sil
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={pending || appointment.status === "iptal"}
              >
                <XCircle className="h-4 w-4" /> İptal
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNoShow}
                disabled={pending || appointment.status === "gelmedi"}
              >
                <UserMinus className="h-4 w-4" /> Gelmedi
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
                disabled={pending}
              >
                <Pencil className="h-4 w-4" /> Düzenle
              </Button>
              {!completingMode ? (
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => setCompletingMode(true)}
                  disabled={pending || appointment.status === "tamamlandi"}
                >
                  <CheckCircle2 className="h-4 w-4" /> Tamamlandı
                </Button>
              ) : (
                <Button variant="accent" size="sm" onClick={handleComplete} disabled={pending}>
                  {pending && <Loader2 className="h-4 w-4 animate-spin" />} Kaydet
                </Button>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {editing && (
        <AppointmentFormDialog
          open
          onOpenChange={(o) => {
            setEditing(o)
            if (!o) onOpenChange(false)
          }}
          mode="edit"
          students={students}
          isPartOfSeries={isPartOfSeries}
          initial={{
            id: appointment.id,
            title: appointment.title,
            type: appointment.type,
            start_time: appointment.start_time,
            end_time: appointment.end_time,
            meeting_link: appointment.meeting_link,
            notes: appointment.notes,
            student_id: appointment.student_id,
          }}
        />
      )}
    </>
  )
}

function Row({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode
  label?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="text-zinc-400 mt-0.5">{icon}</span>}
      <div className="flex-1 min-w-0">
        {label && <div className="text-xs text-zinc-500">{label}</div>}
        <div>{children}</div>
      </div>
    </div>
  )
}
