import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { BookOpen } from "lucide-react"
import { AssignTopicsDialog } from "@/components/koc/assign-topics-dialog"
import { CustomTopicDialog } from "@/components/koc/custom-topic-dialog"
import { StudentTopicRow } from "@/components/koc/student-topic-row"

type Status = "basla" | "devam" | "tamam" | "tekrar"

const statusOrder: Record<Status, number> = { devam: 0, tekrar: 1, basla: 2, tamam: 3 }

export default async function StudentKonularPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: subjects },
    { data: topics },
    { data: assignedRows },
  ] = await Promise.all([
    supabase.from("subjects").select("id, name, exam_type").order("exam_type").order("order"),
    supabase.from("topics").select("id, name, subject_id, order").order("order"),
    supabase
      .from("student_topics")
      .select(
        "id, status, topic_id, custom_name, custom_subject_id, topics(name, subject_id, subjects(name)), subjects:custom_subject_id(name, id)"
      )
      .eq("student_id", id),
  ])

  type Assigned = {
    id: string
    status: Status
    topicName: string
    subjectName: string
    isCustom: boolean
    sortKey: string
  }

  const assigned: Assigned[] = (assignedRows ?? []).map((r) => {
    const isCustom = !r.topic_id
    const topicName = isCustom ? r.custom_name ?? "—" : r.topics?.name ?? "—"
    const subjectName = isCustom
      ? r.subjects?.name ?? "—"
      : r.topics?.subjects?.name ?? "—"
    return {
      id: r.id,
      status: (r.status as Status) ?? "basla",
      topicName,
      subjectName,
      isCustom,
      sortKey: subjectName.toLocaleLowerCase("tr"),
    }
  })

  const counts: Record<Status, number> = { basla: 0, devam: 0, tamam: 0, tekrar: 0 }
  for (const a of assigned) counts[a.status]++

  // Ders bazlı gruplandır
  const groups = new Map<string, Assigned[]>()
  for (const a of assigned) {
    const list = groups.get(a.subjectName) ?? []
    list.push(a)
    groups.set(a.subjectName, list)
  }
  for (const list of groups.values()) {
    list.sort((x, y) => statusOrder[x.status] - statusOrder[y.status])
  }
  const groupKeys = Array.from(groups.keys()).sort((a, b) =>
    a.localeCompare(b, "tr")
  )

  const assignedTopicIds = (assignedRows ?? [])
    .filter((r) => r.topic_id)
    .map((r) => r.topic_id as string)

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h2 className="text-base font-semibold text-zinc-900">Konu Yönetimi</h2>
        <div className="flex items-center gap-2">
          <CustomTopicDialog studentId={id} subjects={subjects ?? []} />
          <AssignTopicsDialog
            studentId={id}
            subjects={subjects ?? []}
            topics={topics ?? []}
            assignedTopicIds={assignedTopicIds}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Başla" count={counts.basla} variant="outline" />
        <Stat label="Devam" count={counts.devam} variant="partial" />
        <Stat label="Tamam" count={counts.tamam} variant="paid" />
        <Stat label="Tekrar" count={counts.tekrar} variant="pending" />
      </div>

      {assigned.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
          <BookOpen className="h-6 w-6 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-900 mb-1">Henüz konu atanmamış</h3>
          <p className="text-sm text-zinc-500">Sağ üstten konu ata.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupKeys.map((subjectName) => {
            const list = groups.get(subjectName) ?? []
            return (
              <div
                key={subjectName}
                className="bg-white border border-zinc-200 rounded-2xl overflow-hidden"
              >
                <div className="bg-zinc-50 px-4 py-2 border-b border-zinc-200 flex items-center justify-between">
                  <span className="text-sm font-semibold text-zinc-700">{subjectName}</span>
                  <Badge variant="outline">{list.length}</Badge>
                </div>
                <div>
                  {list.map((a) => (
                    <StudentTopicRow
                      key={a.id}
                      studentId={id}
                      trackingId={a.id}
                      topicName={a.topicName}
                      isCustom={a.isCustom}
                      status={a.status}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Stat({
  label,
  count,
  variant,
}: {
  label: string
  count: number
  variant: "paid" | "partial" | "pending" | "outline"
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center justify-between">
      <span className="text-sm text-zinc-600">{label}</span>
      <Badge variant={variant}>{count}</Badge>
    </div>
  )
}
