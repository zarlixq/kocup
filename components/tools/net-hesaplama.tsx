"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Calculator, ArrowRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  TYT_SUBJECTS,
  AYT_FIELDS,
  LGS_SESSIONS,
  calcNet,
  type Subject,
  type AytFieldKey,
} from "@/lib/tools/config"
import { trackToolUse } from "@/lib/analytics/track"

type Row = { correct: string; wrong: string }
type Rows = Record<string, Row>

const EMPTY_ROW: Row = { correct: "", wrong: "" }

function clamp(n: number, max: number) {
  return Math.min(Math.max(0, n), max)
}

function parseRow(row: Row, max: number) {
  const correct = clamp(Number(row.correct) || 0, max)
  const wrong = clamp(Number(row.wrong) || 0, max - correct)
  return { correct, wrong }
}

function SubjectRow({
  subject,
  row,
  exam,
  onChange,
}: {
  subject: Subject
  row: Row
  exam: "yks" | "lgs"
  onChange: (key: string, next: Row) => void
}) {
  const { correct, wrong } = parseRow(row, subject.count)
  const net = calcNet({ correct, wrong, exam })

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="font-semibold text-zinc-900 truncate">{subject.label}</div>
          <div className="text-xs text-zinc-500">{subject.count} soru</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Net</div>
          <div className="font-extrabold text-[#1B6B8A] text-lg leading-none tabular-nums">
            {net.toFixed(2)}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor={`${subject.key}-correct`} className="text-xs text-zinc-600 mb-1 block">
            Doğru
          </Label>
          <Input
            id={`${subject.key}-correct`}
            type="number"
            inputMode="numeric"
            min={0}
            max={subject.count}
            value={row.correct}
            onChange={(e) => onChange(subject.key, { ...row, correct: e.target.value })}
            placeholder="0"
            className="h-11"
            aria-label={`${subject.label} doğru sayısı`}
          />
        </div>
        <div>
          <Label htmlFor={`${subject.key}-wrong`} className="text-xs text-zinc-600 mb-1 block">
            Yanlış
          </Label>
          <Input
            id={`${subject.key}-wrong`}
            type="number"
            inputMode="numeric"
            min={0}
            max={subject.count}
            value={row.wrong}
            onChange={(e) => onChange(subject.key, { ...row, wrong: e.target.value })}
            placeholder="0"
            className="h-11"
            aria-label={`${subject.label} yanlış sayısı`}
          />
        </div>
      </div>
    </div>
  )
}

function TotalCard({ label, net }: { label: string; net: number }) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-[#1B6B8A] to-[#0F4A60] text-white p-4 sm:p-5 flex items-center justify-between">
      <div>
        <div className="text-[11px] uppercase tracking-widest text-white/70">{label}</div>
        <div className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums">
          {net.toFixed(2)}
        </div>
      </div>
      <Calculator className="w-10 h-10 text-white/30" aria-hidden="true" />
    </div>
  )
}

function totalNet(subjects: Subject[], rows: Rows, exam: "yks" | "lgs") {
  return subjects.reduce((sum, s) => {
    const { correct, wrong } = parseRow(rows[s.key] ?? EMPTY_ROW, s.count)
    return sum + calcNet({ correct, wrong, exam })
  }, 0)
}

function hasValidEntries(subjects: Subject[], rows: Rows): boolean {
  return subjects.some((s) => {
    const r = rows[s.key]
    if (!r) return false
    const parsed = parseRow(r, s.count)
    return parsed.correct > 0 || parsed.wrong > 0
  })
}

export function NetHesaplama() {
  const [tytRows, setTytRows] = useState<Rows>({})
  const [aytField, setAytField] = useState<AytFieldKey>("sayisal")
  const [aytRows, setAytRows] = useState<Rows>({})
  const [lgsRows, setLgsRows] = useState<Rows>({})

  const makeUpdater = useCallback(
    (setter: React.Dispatch<React.SetStateAction<Rows>>) =>
      (key: string, next: Row) => {
        setter((prev) => ({ ...prev, [key]: next }))
      },
    []
  )

  const aytSubjects = useMemo(
    () => AYT_FIELDS.find((f) => f.key === aytField)?.subjects ?? [],
    [aytField]
  )

  const tytTotal = useMemo(() => totalNet(TYT_SUBJECTS, tytRows, "yks"), [tytRows])
  const aytTotal = useMemo(() => totalNet(aytSubjects, aytRows, "yks"), [aytSubjects, aytRows])

  // İlk geçerli hesaplama (en az bir derste doğru veya yanlış > 0) gerçekleşince
  // OTURUM/MOUNT başına BİR KEZ tool_use eventi gönder.
  const trackedRef = useRef(false)
  const hasValid = useMemo(
    () =>
      hasValidEntries(TYT_SUBJECTS, tytRows) ||
      hasValidEntries(aytSubjects, aytRows) ||
      LGS_SESSIONS.some((s) => hasValidEntries(s.subjects, lgsRows)),
    [tytRows, aytRows, aytSubjects, lgsRows]
  )
  useEffect(() => {
    if (trackedRef.current || !hasValid) return
    trackedRef.current = true
    trackToolUse("net-hesaplama")
  }, [hasValid])

  const updateTyt = makeUpdater(setTytRows)
  const updateAyt = makeUpdater(setAytRows)
  const updateLgs = makeUpdater(setLgsRows)

  return (
    <Card className="p-4 sm:p-6">
      <Tabs defaultValue="tyt" className="w-full">
        <TabsList className="grid grid-cols-3 w-full h-auto p-1">
          <TabsTrigger value="tyt" className="py-2.5">TYT</TabsTrigger>
          <TabsTrigger value="ayt" className="py-2.5">AYT</TabsTrigger>
          <TabsTrigger value="lgs" className="py-2.5">LGS</TabsTrigger>
        </TabsList>

        <TabsContent value="tyt" className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TYT_SUBJECTS.map((s) => (
              <SubjectRow
                key={s.key}
                subject={s}
                row={tytRows[s.key] ?? EMPTY_ROW}
                exam="yks"
                onChange={updateTyt}
              />
            ))}
          </div>
          <TotalCard label="TYT Toplam Net" net={tytTotal} />
        </TabsContent>

        <TabsContent value="ayt" className="mt-5 space-y-4">
          <div>
            <Label htmlFor="ayt-alan" className="text-xs text-zinc-600 mb-1.5 block">
              Alan
            </Label>
            <Select
              value={aytField}
              onValueChange={(v) => setAytField(v as AytFieldKey)}
            >
              <SelectTrigger id="ayt-alan" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AYT_FIELDS.map((f) => (
                  <SelectItem key={f.key} value={f.key}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {aytSubjects.map((s) => (
              <SubjectRow
                key={s.key}
                subject={s}
                row={aytRows[s.key] ?? EMPTY_ROW}
                exam="yks"
                onChange={updateAyt}
              />
            ))}
          </div>
          <TotalCard label="AYT Toplam Net" net={aytTotal} />
        </TabsContent>

        <TabsContent value="lgs" className="mt-5 space-y-5">
          {LGS_SESSIONS.map((session) => {
            const sessionTotal = totalNet(session.subjects, lgsRows, "lgs")
            return (
              <div key={session.key} className="space-y-3">
                <div className="text-xs uppercase tracking-widest text-[#F97316] font-semibold">
                  {session.label}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {session.subjects.map((s) => (
                    <SubjectRow
                      key={s.key}
                      subject={s}
                      row={lgsRows[s.key] ?? EMPTY_ROW}
                      exam="lgs"
                      onChange={updateLgs}
                    />
                  ))}
                </div>
                <TotalCard label={`${session.label} Net`} net={sessionTotal} />
              </div>
            )
          })}
          <TotalCard
            label="LGS Toplam Net"
            net={LGS_SESSIONS.reduce(
              (sum, s) => sum + totalNet(s.subjects, lgsRows, "lgs"),
              0
            )}
          />
        </TabsContent>
      </Tabs>

      <div className="mt-6 pt-5 border-t border-zinc-200">
        <p className="text-sm text-zinc-600 mb-2.5">
          Netini hafta hafta takip etmek ister misin? Koçunla birlikte ilerleme raporu al.
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
