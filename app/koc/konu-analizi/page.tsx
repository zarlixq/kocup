import { redirect } from "next/navigation"

// Aggregate konu-analizi artık sidebar'da yok; öğrenci detayında tab olarak
// erişilebilir. Eski URL'leri öğrenci listesine yönlendir.
export default function KocKonuAnaliziRedirect() {
  redirect("/koc/ogrenciler")
}
