"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { AlertCircle, ArrowRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { EXAM_DATES, type ExamDate } from "@/lib/tools/config"
import { trackToolUse } from "@/lib/analytics/track"

type Diff = {
  days: number
  hours: number
  minutes: number
  seconds: number
  expired: boolean
}

function calcDiff(targetMs: number, nowMs: number): Diff {
  const ms = targetMs - nowMs
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((ms / (1000 * 60)) % 60)
  const seconds = Math.floor((ms / 1000) % 60)
  return { days, hours, minutes, seconds, expired: false }
}

function nextExam(list: ExamDate[]): ExamDate | null {
  const now = Date.now()
  return (
    list
      .filter((e) => new Date(e.startsAt).getTime() > now)
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
      )[0] ?? null
  )
}

const TR_DATE = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

function CountdownCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-[#1B6B8A] to-[#0F4A60] text-white p-3 sm:p-5 text-center">
      <div className="text-2xl sm:text-4xl font-extrabold tabular-nums leading-none">
        {String(value).padStart(2, "0")}
      </div>
      <div className="text-[10px] sm:text-xs uppercase tracking-widest text-white/70 mt-1.5">
        {label}
      </div>
    </div>
  )
}

function Counter({ exam }: { exam: ExamDate | null }) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => setNow(Date.now())
    const initialTimer = setTimeout(tick, 0)
    const id = setInterval(tick, 1000)
    return () => {
      clearTimeout(initialTimer)
      clearInterval(id)
    }
  }, [])

  const targetMs = useMemo(
    () => (exam ? new Date(exam.startsAt).getTime() : null),
    [exam]
  )

  if (!exam || targetMs === null) {
    return (
      <div className="text-center py-8 text-zinc-500 text-sm">
        Yaklaşan bir sınav tarihi tanımlı değil.
      </div>
    )
  }

  const d: Diff = now === null
    ? { days: 0, hours: 0, minutes: 0, seconds: 0, expired: false }
    : calcDiff(targetMs, now)

  return (
    <>
      <div className="mb-4 sm:mb-6">
        <div className="text-xs sm:text-sm uppercase tracking-widest text-[#F97316] font-semibold">
          {exam.label}
        </div>
        <div className="text-sm text-zinc-500 mt-1">
          {exam.description ?? "Sınav"} ·{" "}
          <span className="tabular-nums">{TR_DATE.format(new Date(exam.startsAt))}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <CountdownCell label="Gün" value={d.days} />
        <CountdownCell label="Saat" value={d.hours} />
        <CountdownCell label="Dakika" value={d.minutes} />
        <CountdownCell label="Saniye" value={d.seconds} />
      </div>

      {!exam.confirmed && (
        <div className="mt-4 flex gap-2 items-start text-xs sm:text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" aria-hidden="true" />
          <span>
            Bu tarih tahminidir. ÖSYM/MEB resmi takvimi açıkladığında güncellenecektir.
          </span>
        </div>
      )}
    </>
  )
}

export function GeriSayim() {
  // Geri sayım pasif bir araç — mount edildiğinde araç görüntülenmiş sayılır.
  // useRef bayrağı strict mode + ardışık effect çağrılarında çift gönderimi önler.
  const trackedRef = useRef(false)
  useEffect(() => {
    if (trackedRef.current) return
    trackedRef.current = true
    trackToolUse("geri-sayim")
  }, [])

  const yksExam = nextExam(EXAM_DATES.yks)
  const lgsExam = nextExam(EXAM_DATES.lgs)

  return (
    <Card className="p-4 sm:p-6">
      <Tabs defaultValue="yks" className="w-full">
        <TabsList className="grid grid-cols-2 w-full h-auto p-1">
          <TabsTrigger value="yks" className="py-2.5">YKS</TabsTrigger>
          <TabsTrigger value="lgs" className="py-2.5">LGS</TabsTrigger>
        </TabsList>
        <TabsContent value="yks" className="mt-5">
          <Counter exam={yksExam} />
        </TabsContent>
        <TabsContent value="lgs" className="mt-5">
          <Counter exam={lgsExam} />
        </TabsContent>
      </Tabs>

      <div className="mt-6 pt-5 border-t border-zinc-200">
        <p className="text-sm text-zinc-600 mb-2.5">
          Süre azalıyor, plan eksik mi? KoçUp&apos;la haftalık çalışma planı kur.
        </p>
        <Link
          href="/basvuru"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#F97316] hover:gap-2.5 transition-all"
        >
          Ücretsiz başvur
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    </Card>
  )
}
