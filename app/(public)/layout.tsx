import { Toaster } from "@/components/ui/sonner"
import { WhatsappFab } from "@/components/shared/whatsapp-fab"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <WhatsappFab />
      <Toaster />
    </>
  )
}
