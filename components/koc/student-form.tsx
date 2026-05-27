"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { inviteStudentAction, updateStudentAction } from "@/app/koc/ogrenciler/actions"
import { toast } from "sonner"

type Student = {
  id?: string
  full_name?: string | null
  email?: string | null
  phone?: string | null
  parent_name?: string | null
  parent_phone?: string | null
  school?: string | null
  grade?: string | null
  notes?: string | null
}

export function StudentForm({ student }: { student?: Student }) {
  const isEdit = Boolean(student?.id)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <form
      action={(fd) => {
        setError(null)
        startTransition(async () => {
          const res = isEdit
            ? await updateStudentAction(student!.id!, fd)
            : await inviteStudentAction(fd)
          if (res?.error) {
            setError(res.error)
            toast.error(res.error)
          } else {
            toast.success(isEdit ? "Öğrenci güncellendi" : "Öğrenci eklendi, davet emaili gönderildi")
          }
        })
      }}
      className="space-y-5"
    >
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Ad Soyad *</Label>
          <Input id="full_name" name="full_name" required defaultValue={student?.full_name ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required={!isEdit}
            disabled={isEdit}
            defaultValue={student?.email ?? ""}
            placeholder="ogrenci@ornek.com"
            className={isEdit ? "bg-zinc-50" : ""}
          />
          {!isEdit && (
            <p className="text-xs text-zinc-500">Davet emaili bu adrese gönderilir.</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefon</Label>
          <Input id="phone" name="phone" defaultValue={student?.phone ?? ""} placeholder="0 5__ ___ __ __" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="grade">Sınıf *</Label>
          <Select name="grade" defaultValue={student?.grade ?? "12"} required>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7. Sınıf (LGS)</SelectItem>
              <SelectItem value="8">8. Sınıf (LGS)</SelectItem>
              <SelectItem value="9">9. Sınıf</SelectItem>
              <SelectItem value="10">10. Sınıf</SelectItem>
              <SelectItem value="11">11. Sınıf</SelectItem>
              <SelectItem value="12">12. Sınıf</SelectItem>
              <SelectItem value="Mezun">Mezun</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="school">Okul</Label>
          <Input id="school" name="school" defaultValue={student?.school ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="parent_name">Veli Adı</Label>
          <Input id="parent_name" name="parent_name" defaultValue={student?.parent_name ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="parent_phone">Veli Telefonu</Label>
          <Input id="parent_phone" name="parent_phone" defaultValue={student?.parent_phone ?? ""} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notlar</Label>
        <Textarea id="notes" name="notes" defaultValue={student?.notes ?? ""} rows={3} />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" variant="accent" disabled={pending}>
          {pending
            ? "Kaydediliyor..."
            : isEdit
              ? "Güncelle"
              : "Öğrenciyi Ekle ve Davet Gönder"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          İptal
        </Button>
      </div>
    </form>
  )
}
