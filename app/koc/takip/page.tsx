import { redirect } from "next/navigation"

// Aggregate takip artık sidebar'da yok; öğrenci detayında "Takip" tab'ı var.
// Eski URL'leri öğrenci listesine yönlendir.
export default function KocTakipRedirect() {
  redirect("/koc/ogrenciler")
}
