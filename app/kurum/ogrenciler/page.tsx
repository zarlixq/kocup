import { createClient } from "@/lib/supabase/server"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getCurrentProfile } from "@/lib/auth/current-user"

export const metadata = { title: "Öğrenciler — Kurum" }

function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export default async function KurumOgrencilerPage() {
  const profile = await getCurrentProfile()
  const orgId = profile!.organization_id!

  const supabase = await createClient()
  const { data: students } = await supabase
    .from("students")
    .select("id, grade, school, coach_id, is_active, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })

  const studentIds = (students ?? []).map((s) => s.id)
  const coachIds = Array.from(
    new Set((students ?? []).map((s) => s.coach_id).filter(Boolean) as string[]),
  )

  const [{ data: studentProfiles }, { data: coachProfiles }] = await Promise.all([
    studentIds.length
      ? supabase.from("profiles").select("id, full_name, email").in("id", studentIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string; email: string }> }),
    coachIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", coachIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string }> }),
  ])

  const profileById = new Map((studentProfiles ?? []).map((p) => [p.id, p]))
  const coachById = new Map((coachProfiles ?? []).map((c) => [c.id, c.full_name]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Öğrenciler</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {(students ?? []).length} kayıtlı öğrenci
        </p>
      </div>

      {(students ?? []).length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
          <h3 className="text-base font-semibold text-zinc-900 mb-1">Henüz öğrenci yok</h3>
          <p className="text-sm text-zinc-500">
            Kurum koçları öğrenci ekledikçe burada listelenecek.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Öğrenci</TableHead>
                <TableHead>Sınıf</TableHead>
                <TableHead>Okul</TableHead>
                <TableHead>Koç</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(students ?? []).map((s) => {
                const p = profileById.get(s.id)
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-[#1B6B8A] text-white text-xs">
                            {initials(p?.full_name ?? "—")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium text-zinc-900 truncate">
                            {p?.full_name ?? "—"}
                          </div>
                          <div className="text-xs text-zinc-500 truncate">{p?.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {s.grade ? (
                        <Badge variant="outline">
                          {s.grade === "Mezun" ? "Mezun" : `${s.grade}. Sınıf`}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-zinc-600">{s.school ?? "—"}</TableCell>
                    <TableCell className="text-zinc-600">
                      {s.coach_id ? coachById.get(s.coach_id) ?? "—" : "Atanmamış"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.is_active ? "paid" : "inactive"}>
                        {s.is_active ? "Aktif" : "Pasif"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
