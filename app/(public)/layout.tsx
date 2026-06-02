import { Toaster } from "@/components/ui/sonner"
import { WhatsappFab } from "@/components/shared/whatsapp-fab"
import { PageViewTracker } from "@/components/analytics/page-view-tracker"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <PageViewTracker />
      <WhatsappFab />
      <Toaster />
    </>
  )
}
