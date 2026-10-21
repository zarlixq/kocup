import { Navbar } from "@/blocks/Navbar"
import Footer from "@/blocks/Footer"

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="bg-[#FAFAF8] min-h-screen">{children}</main>
      <Footer />
    </>
  )
}
