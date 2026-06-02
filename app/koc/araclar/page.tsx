import type { Metadata } from "next"
import { Calculator, AlarmClock, TimerReset, Compass } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NetHesaplama } from "@/components/tools/net-hesaplama"
import { GeriSayim } from "@/components/tools/geri-sayim"
import { PomodoroPublic } from "@/components/tools/pomodoro-public"
import { TercihRehberi } from "@/components/tools/tercih-rehberi"

export const metadata: Metadata = {
  title: "Araçlar",
  description: "Net hesaplama, geri sayım, pomodoro ve tercih rehberi.",
}

export default function KocAraclarPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 tracking-tight">
          Araçlar
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Net hesaplama, geri sayım, pomodoro ve YÖK Atlas tercih rehberi — öğrencilerinle de
          paylaşabilirsin.
        </p>
      </div>

      <Tabs defaultValue="net-hesaplama" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1 gap-1">
          <TabsTrigger
            value="net-hesaplama"
            className="flex items-center justify-center gap-2 py-2.5 min-h-[44px]"
          >
            <Calculator className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Net Hesap</span>
            <span className="sm:hidden">Net</span>
          </TabsTrigger>
          <TabsTrigger
            value="geri-sayim"
            className="flex items-center justify-center gap-2 py-2.5 min-h-[44px]"
          >
            <AlarmClock className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Geri Sayım</span>
            <span className="sm:hidden">Sayaç</span>
          </TabsTrigger>
          <TabsTrigger
            value="pomodoro"
            className="flex items-center justify-center gap-2 py-2.5 min-h-[44px]"
          >
            <TimerReset className="w-4 h-4" aria-hidden="true" />
            Pomodoro
          </TabsTrigger>
          <TabsTrigger
            value="tercih-rehberi"
            className="flex items-center justify-center gap-2 py-2.5 min-h-[44px]"
          >
            <Compass className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Tercih Rehberi</span>
            <span className="sm:hidden">Tercih</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="net-hesaplama" className="mt-5">
          <NetHesaplama />
        </TabsContent>
        <TabsContent value="geri-sayim" className="mt-5">
          <GeriSayim />
        </TabsContent>
        <TabsContent value="pomodoro" className="mt-5">
          {/* Panel layout zaten PomodoroProvider mount ediyor — ikinci engine'i önlemek için kapatıyoruz */}
          <PomodoroPublic withProvider={false} />
        </TabsContent>
        <TabsContent value="tercih-rehberi" className="mt-5">
          <TercihRehberi />
        </TabsContent>
      </Tabs>
    </div>
  )
}
