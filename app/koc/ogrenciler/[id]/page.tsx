import { StudentOverview } from "@/components/student/student-overview"

export default async function StudentOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <StudentOverview studentId={id} variant="coach" appointmentsHref="/koc/randevular" />
}
