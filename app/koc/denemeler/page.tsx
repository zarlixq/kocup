import { redirect } from "next/navigation"

// Aggregate denemeler artık sidebar'da yok; öğrenci detayında tab olarak
// erişilebilir. Eski URL'leri öğrenci listesine yönlendir.
export default function KocDenemelerRedirect() {
  redirect("/koc/ogrenciler")
}
