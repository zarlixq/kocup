"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateTopicStatusAction } from "@/app/ogrenci/konularim/actions"

const OPTIONS = [
  { value: "basla", label: "Başla" },
  { value: "devam", label: "Devam" },
  { value: "tamam", label: "Tamam" },
  { value: "tekrar", label: "Tekrar" },
]

export function TopicStatusSelect({ topicId, status }: { topicId: string; status: string }) {
  const [pending, start] = useTransition()

  function onChange(next: string) {
    if (next === status) return
    start(async () => {
      const res = await updateTopicStatusAction(topicId, next)
      if (res?.error) toast.error(res.error)
      else toast.success("Statü güncellendi.")
    })
  }

  return (
    <Select value={status} onValueChange={onChange} disabled={pending}>
      <SelectTrigger className="w-32 h-8 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
