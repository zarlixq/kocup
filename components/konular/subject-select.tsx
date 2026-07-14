"use client"

import type { ReactNode } from "react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  groupSubjectsByCurriculum,
  type GroupableSubject,
} from "@/lib/curriculum/group-subjects"

type Props = {
  subjects: GroupableSubject[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  /** Gruplardan ÖNCE render edilen item(lar), ör. "Ders yok" / "Tüm dersler". */
  leading?: ReactNode
  /** Gruplardan SONRA render edilen item(lar), ör. "Özel başlık gir…". */
  trailing?: ReactNode
  triggerId?: string
  triggerClassName?: string
  contentClassName?: string
  disabled?: boolean
}

/**
 * Müfredat + sınav türüne göre gruplu ders seçme dropdown'u.
 * Gruplama tek kaynaktan gelir (groupSubjectsByCurriculum). Program ve
 * konu-atama dialoglarının ortak bileşeni; leading/trailing ile özel
 * item'lar (Ders yok, Özel başlık, Tüm dersler) eklenebilir.
 */
export function SubjectSelect({
  subjects,
  value,
  onValueChange,
  placeholder = "Ders seç",
  leading,
  trailing,
  triggerId,
  triggerClassName,
  contentClassName = "max-h-72",
  disabled,
}: Props) {
  const groups = groupSubjectsByCurriculum(subjects)
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={triggerId} className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        {leading}
        {groups.map((g) => (
          <SelectGroup key={g.label}>
            <SelectLabel>{g.label}</SelectLabel>
            {g.subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
        {trailing}
      </SelectContent>
    </Select>
  )
}
