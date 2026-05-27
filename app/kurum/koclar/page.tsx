import { Plus } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getCurrentProfile } from "@/lib/auth/current-user"
import { InviteCoachToOrgDialog } from "@/components/kurum/invite-coach-dialog"

export const metadata = { title: "Koçlar — Kurum" }

function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function formatDate(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export default async function KurumKoclarPage() {
  const profile = await getCurrentProfile()
  const orgId = profile!.organization_id!

  const supabase = await createClient()
  const { data: coaches } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, created_at")
    .eq("organization_id", orgId)
    .eq("role", "coach")
    .order("created_at", { ascending: false })

  const coachIds = (coaches ?? []).map((c) => c.id)
  const { data: students } = coachIds.length
    ? await supabase
        .from("students")
        .select("coach_id")
        .in("coach_id", coachIds)
        .eq("is_active", true)
    : { data: [] as Array<{ coach_id: string | null }> }

  const studentCountByCoach = new Map<string, number>()
  for (const s of students ?? []) {
    if (!s.coach_id) continue
    studentCountByCoach.set(s.coach_id, (studentCountByCoach.get(s.coach_id) ?? 0) + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Koçlar</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Kurumunuza bağlı koçları yönetin ve yeni koç davet edin.
          </p>
        </div>
        <InviteCoachToOrgDialog>
          <Button variant="accent">
            <Plus className="h-4 w-4" /> Yeni Koç Davet Et
          </Button>
        </InviteCoachToOrgDialog>
      </div>

      {(coaches ?? []).length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
          <h3 className="text-base font-semibold text-zinc-900 mb-1">Henüz koç yok</h3>
          <p className="text-sm text-zinc-500 mb-5">
            İlk koçunuzu davet etmek için yukarıdaki butona tıklayın.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Koç</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Öğrenci</TableHead>
                <TableHead>Eklendi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(coaches ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/kurum/koclar/${c.id}`} className="flex items-center gap-3 hover:opacity-80">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-[#1B6B8A] text-white text-xs">
                          {initials(c.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-medium text-zinc-900 truncate">{c.full_name}</div>
                        <div className="text-xs text-zinc-500 truncate">{c.email}</div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="text-zinc-600">{c.phone ?? "—"}</TableCell>
                  <TableCell className="tabular-nums">{studentCountByCoach.get(c.id) ?? 0}</TableCell>
                  <TableCell className="text-zinc-600">{formatDate(c.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
