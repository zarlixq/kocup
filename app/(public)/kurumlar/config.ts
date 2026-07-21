// /kurumlar sayfasının tek yerden yönetilen içerik ayarları.
// Video linklerini ekleyince player otomatik aktifleşir
// (http ile başlamayan değerler "yakında" olarak gösterilir).

export const KURUMLAR_VIDEOS = {
  mudur: "https://www.youtube.com/watch?v=58QyTy6Fcas",
  koc: "https://www.youtube.com/watch?v=7rVCE99GzDQ",
  ogrenci: "[VIDEO_URL_3]",
} as const

export const KURUMLAR_CONTACT = {
  phoneDisplay: "0533 370 43 91",
  phoneHref: "tel:+905333704391",
  whatsappHref:
    "https://wa.me/905333704391?text=" +
    encodeURIComponent("Merhaba, KoçUp kurumsal demo talep etmek istiyorum."),
} as const
