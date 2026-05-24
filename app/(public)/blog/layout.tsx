import { Navbar } from "@/blocks/Navbar"
import Footer from "@/blocks/Footer"

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar variant="solid" />
      <main className="bg-[#FAFAF8] min-h-screen">{children}</main>
      <Footer />
    </>
  )
}
