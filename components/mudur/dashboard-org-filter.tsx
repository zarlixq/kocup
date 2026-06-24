"use client"

import { useRouter } from "next/navigation"
import { Building2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function DashboardOrgFilter({
  current,
  orgs,
}: {
  current: string
  orgs: { id: string; name: string }[]
}) {
  const router = useRouter()
  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-zinc-400" />
      <Select
        value={current}
        onValueChange={(v) => router.push(v === "all" ? "/mudur" : `/mudur?org=${v}`)}
      >
        <SelectTrigger className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tümü (tüm platform)</SelectItem>
          <SelectItem value="bireysel">Bireysel öğrenciler</SelectItem>
          {orgs.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
