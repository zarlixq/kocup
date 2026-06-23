export const RESOURCE_TYPES = [
  "soru_bankasi",
  "konu_anlatimi",
  "deneme",
  "foy",
] as const

export type ResourceType = (typeof RESOURCE_TYPES)[number]

export const RESOURCE_TYPE_LABEL: Record<string, string> = {
  soru_bankasi: "Soru Bankası",
  konu_anlatimi: "Konu Anlatımı",
  deneme: "Deneme",
  foy: "Föy",
}

export const RESOURCE_STATUSES = ["aktif", "bitti", "birakildi"] as const
export type ResourceStatus = (typeof RESOURCE_STATUSES)[number]

export const RESOURCE_STATUS_LABEL: Record<string, string> = {
  aktif: "Aktif",
  bitti: "Bitti",
  birakildi: "Bırakıldı",
}
