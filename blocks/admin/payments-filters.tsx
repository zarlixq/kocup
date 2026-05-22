"use client"

import { useRouter } from "next/navigation"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { monthOptions } from "@/lib/payments"
import { formatMonth, isoDate } from "@/lib/format"

export function PaymentsFilters({
  defaultMonth,
  defaultStudent,
  defaultMethod,
  students,
}: {
  defaultMonth: string
  defaultStudent: string
  defaultMethod: string
  students: { id: string; full_name: string }[]
}) {
  const router = useRouter()
  const months = monthOptions(12, 3)

  function update(next: Record<string, string>) {
    const params = new URLSearchParams()
    const base = { ay: defaultMonth, ogrenci: defaultStudent, yontem: defaultMethod, ...next }
    for (const [k, v] of Object.entries(base)) {
      if (v && v !== "tum_o" && v !== "tum_y") params.set(k, v)
    }
    router.replace(`/admin/odemeler?${params.toString()}`)
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-1.5">
        <Label>Ay</Label>
        <Select value={defaultMonth} onValueChange={(v) => update({ ay: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tum">Tüm Aylar</SelectItem>
            {months.map((d) => {
              const iso = isoDate(d)
              return (
                <SelectItem key={iso} value={iso} className="capitalize">
                  {formatMonth(d)}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Öğrenci</Label>
        <Select value={defaultStudent || "tum_o"} onValueChange={(v) => update({ ogrenci: v === "tum_o" ? "" : v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tum_o">Tüm Öğrenciler</SelectItem>
            {students.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Yöntem</Label>
        <Select value={defaultMethod || "tum_y"} onValueChange={(v) => update({ yontem: v === "tum_y" ? "" : v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tum_y">Tümü</SelectItem>
            <SelectItem value="nakit">Nakit</SelectItem>
            <SelectItem value="havale">Havale/EFT</SelectItem>
            <SelectItem value="kart">Kredi Kartı</SelectItem>
            <SelectItem value="diger">Diğer</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
