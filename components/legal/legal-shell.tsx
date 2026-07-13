import { AlertTriangle } from "lucide-react"
import { Navbar } from "@/blocks/Navbar"
import Footer from "@/blocks/Footer"

type LegalShellProps = {
  title: string
  updated: string
  children: React.ReactNode
  /** Taslak uyarı banner'ını gösterir. Yayına hazır sayfalarda false verilir. */
  draft?: boolean
}

export function LegalShell({ title, updated, children, draft = true }: LegalShellProps) {
  return (
    <>
      <Navbar variant="solid" />
      <main className="bg-zinc-50/40 min-h-screen">
        <div className="max-w-3xl mx-auto px-5 md:px-8 py-12 md:py-16">
          {draft && (
            <div
              role="alert"
              className="mb-8 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" aria-hidden="true" />
              <span>
                <strong>[HUKUKÇU ONAYI BEKLİYOR]</strong> — Bu metin taslaktır ve canlıya
                alınmadan önce hukuk danışmanı tarafından gözden geçirilecektir.
              </span>
            </div>
          )}

          <header className="mb-8">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900">
              {title}
            </h1>
            <p className="text-sm text-zinc-500 mt-2">Son güncelleme: {updated}</p>
          </header>

          <div
            className="
              space-y-4
              [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-zinc-900 [&_h2]:mt-8 [&_h2]:mb-1
              [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-zinc-900 [&_h3]:mt-5 [&_h3]:mb-1
              [&_p]:text-sm [&_p]:text-zinc-600 [&_p]:leading-relaxed
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:text-sm [&_ul]:text-zinc-600
              [&_li]:leading-relaxed
              [&_a]:text-[#1B6B8A] [&_a]:underline [&_a]:underline-offset-2
              [&_strong]:text-zinc-800
            "
          >
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
