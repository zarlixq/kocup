"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4 text-center">
      <h2 className="text-xl font-semibold text-zinc-900 mb-2">Bir şeyler ters gitti</h2>
      <p className="text-zinc-500 mb-6">Beklenmeyen bir hata oluştu. Tekrar deneyebilirsin.</p>
      <Button onClick={reset} className="bg-[#1B6B8A] hover:bg-[#155a75]">
        Tekrar Dene
      </Button>
    </div>
  )
}
