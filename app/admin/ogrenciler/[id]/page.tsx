import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Pencil, Phone, School as SchoolIcon, User2 } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatTRY, formatDate, formatMonth } from "@/lib/format"
import { differenceInCalendarMonths, parseISO } from "date-fns"
import { PackageFormDialog } from "@/blocks/admin/package-form-dialog"
import { PaymentFormDialog } from "@/blocks/admin/payment-form-dialog"
import { StudentActiveToggle } from "@/blocks/admin/student-active-toggle"
import { DeletePaymentButton } from "@/blocks/admin/delete-payment-button"
import { EndPackageButton } from "@/blocks/admin/end-package-button"

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: student } = await supabase.from("students").select("*").eq("id", id).maybeSingle()
  if (!student) notFound()

  const { data: packages } = await supabase
    .from("packages")
    .select("*")
    .eq("student_id", id)
    .order("created_at", { ascending: false })

  const { data: payments } = await supabase
    .from("payments")
    .select("*, packages(name)")
    .eq("student_id", id)
    .order("payment_date", { ascending: false })

  const activePackages = (packages ?? []).filter((p) => p.status === "active")
  const otherPackages = (packages ?? []).filter((p) => p.status !== "active")
  const orderedPackages = [...activePackages, ...otherPackages]

  const totalPaid = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const totalExpected = (packages ?? []).reduce((sum, p) => {
    const start = parseISO(p.start_date)
    const end = p.end_date ? parseISO(p.end_date) : new Date()
    const months = Math.max(0, differenceInCalendarMonths(end, start) + 1)
    return sum + months * Number(p.monthly_price)
  }, 0)
  const balance = totalPaid - totalExpected

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/ogrenciler" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 mb-2">
          <ArrowLeft className="h-4 w-4" /> Öğrenciler
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
              {student.full_name}
              {!student.is_active && <Badge variant="inactive">Pasif</Badge>}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              {student.grade ? `${student.grade}` : "Sınıf belirtilmemiş"}
              {student.school ? ` · ${student.school}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StudentActiveToggle id={student.id} isActive={Boolean(student.is_active)} />
            <Link href={`/admin/ogrenciler/${student.id}/duzenle`}>
              <Button variant="outline">
                <Pencil className="h-4 w-4" /> Düzenle
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
        <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefon" value={student.phone} />
        <InfoRow icon={<User2 className="h-4 w-4" />} label="Veli" value={student.parent_name} />
        <InfoRow icon={<Phone className="h-4 w-4" />} label="Veli Telefonu" value={student.parent_phone} />
        <InfoRow icon={<SchoolIcon className="h-4 w-4" />} label="Okul" value={student.school} />
        <InfoRow icon={<User2 className="h-4 w-4" />} label="Sınıf" value={student.grade} />
        {student.notes && (
          <div className="md:col-span-3 pt-3 border-t border-zinc-100">
            <div className="text-xs text-zinc-500 mb-1">Notlar</div>
            <div className="text-sm text-zinc-700 whitespace-pre-line">{student.notes}</div>
          </div>
        )}
      </div>

      <Tabs defaultValue="paketler">
        <TabsList>
          <TabsTrigger value="paketler">Paketler</TabsTrigger>
          <TabsTrigger value="odemeler">Ödemeler</TabsTrigger>
          <TabsTrigger value="ozet">Özet</TabsTrigger>
        </TabsList>

        <TabsContent value="paketler">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-zinc-900">Paketler</h2>
            <PackageFormDialog studentId={student.id} trigger={<Button variant="accent" size="sm">Yeni Paket</Button>} />
          </div>
          {orderedPackages.length === 0 ? (
            <EmptyCard text="Henüz paket eklenmemiş." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orderedPackages.map((p) => (
                <div key={p.id} className="bg-white border border-zinc-200 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="font-semibold text-zinc-900">{p.name}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {formatDate(p.start_date)} - {p.end_date ? formatDate(p.end_date) : "devam ediyor"}
                      </div>
                    </div>
                    <Badge variant={p.status === "active" ? "paid" : p.status === "paused" ? "partial" : "inactive"}>
                      {p.status === "active" ? "Aktif" : p.status === "paused" ? "Durduruldu" : "Sonlandı"}
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <div className="text-2xl font-bold text-zinc-900 tabular-nums">{formatTRY(p.monthly_price)}</div>
                    <div className="text-xs text-zinc-500">/ ay</div>
                  </div>
                  <div className="text-xs text-zinc-500 mb-4">Ödeme günü: ayın {p.payment_day ?? 1}'i</div>
                  {p.notes && <div className="text-xs text-zinc-600 mb-4 whitespace-pre-line">{p.notes}</div>}
                  <div className="flex items-center gap-2">
                    <PackageFormDialog
                      studentId={student.id}
                      pkg={p}
                      trigger={<Button variant="outline" size="sm">Düzenle</Button>}
                    />
                    {p.status === "active" && <EndPackageButton packageId={p.id} />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="odemeler">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-zinc-900">Ödemeler</h2>
            <PaymentFormDialog
              studentId={student.id}
              packages={activePackages.length ? activePackages : packages ?? []}
              trigger={<Button variant="accent" size="sm" disabled={(packages ?? []).length === 0}>Ödeme Ekle</Button>}
            />
          </div>
          {!payments || payments.length === 0 ? (
            <EmptyCard text="Henüz ödeme kaydedilmemiş." />
          ) : (
            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Hangi Ay</TableHead>
                    <TableHead>Paket</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                    <TableHead>Yöntem</TableHead>
                    <TableHead>Not</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(p.payment_date)}</TableCell>
                      <TableCell className="whitespace-nowrap capitalize">{formatMonth(p.period_month)}</TableCell>
                      <TableCell className="text-zinc-600">{p.packages?.name ?? "-"}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatTRY(p.amount)}</TableCell>
                      <TableCell className="text-zinc-600">{p.method ?? "-"}</TableCell>
                      <TableCell className="text-zinc-600 max-w-[200px] truncate">{p.notes ?? "-"}</TableCell>
                      <TableCell>
                        <DeletePaymentButton paymentId={p.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="ozet">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard label="Toplam Ödenen" value={formatTRY(totalPaid)} color="text-green-600" />
            <SummaryCard label="Toplam Beklenen" value={formatTRY(totalExpected)} color="text-zinc-900" />
            <SummaryCard
              label={balance >= 0 ? "Fazla" : "Borç"}
              value={formatTRY(Math.abs(balance))}
              color={balance >= 0 ? "text-green-600" : "text-red-600"}
            />
            <SummaryCard label="Toplam Paket" value={String((packages ?? []).length)} color="text-zinc-900" />
            <SummaryCard label="Toplam Ödeme Kaydı" value={String((payments ?? []).length)} color="text-zinc-900" />
            <SummaryCard label="Aktif Paket" value={String(activePackages.length)} color="text-[#1B6B8A]" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-zinc-500">{label}</div>
        <div className="text-sm font-medium text-zinc-900 truncate">{value || "-"}</div>
      </div>
    </div>
  )
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-10 text-center text-sm text-zinc-500">
      {text}
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5">
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${color ?? "text-zinc-900"}`}>{value}</div>
    </div>
  )
}
