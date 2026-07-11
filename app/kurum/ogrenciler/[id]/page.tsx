import { StudentOverview } from "@/components/student/student-overview"

export const metadata = { title: "Öğrenci Detayı — Kurum" }

export default async function KurumStudentOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <StudentOverview
      studentId={id}
      variant="readonly"
      appointmentsHref="/kurum"
      coachHrefPrefix="/kurum/koclar"
    />
  )
}
