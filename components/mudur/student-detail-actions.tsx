"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AssignCoachDialog } from "@/components/mudur/assign-coach-dialog"

type Props = {
  studentId: string
  studentName: string
  currentCoachId: string | null
  coaches: { id: string; full_name: string }[]
}

export function StudentDetailActions({
  studentId,
  studentName,
  currentCoachId,
  coaches,
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className="border-[#1B6B8A] text-[#1B6B8A] hover:bg-[#1B6B8A] hover:text-white"
        >
          {currentCoachId ? "Koç Değiştir" : "Koç Ata"}
        </Button>
        <Button variant="ghost" disabled title="Yakında">
          Pasifleştir
        </Button>
      </div>

      <AssignCoachDialog
        open={open}
        onOpenChange={setOpen}
        studentId={studentId}
        studentName={studentName}
        currentCoachId={currentCoachId}
        coaches={coaches}
      />
    </>
  )
}
