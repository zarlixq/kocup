"use client"

import { ExamForm, type ExamFormInput, type ExamFormSubject } from "@/components/shared/exam-form"
import { createExamForStudentAction } from "@/app/koc/ogrenciler/[id]/denemeler/actions"

export function KocExamFormWrapper({
  studentId,
  subjects,
}: {
  studentId: string
  subjects: ExamFormSubject[]
}) {
  async function onSubmit(input: ExamFormInput) {
    const res = await createExamForStudentAction(studentId, input)
    return res ?? undefined
  }
  return <ExamForm subjects={subjects} onSubmit={onSubmit} />
}
