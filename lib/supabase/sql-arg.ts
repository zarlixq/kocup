/**
 * SQL fonksiyonuna NULL olabilen argüman. `supabase gen types` fonksiyon
 * argümanlarını nullable üretmez (Postgres'te her argüman NULL alabilir; ilgili
 * fonksiyonlar NULL'u bilerek karşılar). database.types.ts elle düzeltilmez,
 * üreticiden geldiği gibi kalır; NULL geçilen çağrılarda bu yardımcı kullanılır.
 */
export function sqlArg<T>(value: T | null): T {
  return value as T
}
