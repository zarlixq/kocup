// Ders grupları — aynı alanın TYT/AYT dersleri tek grup (subjects.name).
//
// Yanlış girerken atom araması grubun TÜM aktif konularında yapılır; DB
// tarafında wrong_answers trigger'ı atomun kaydın konusuyla aynı grupta
// olmasını şart koşar (migration 215, public.subject_groups).
// Değiştirirsen yeni bir migration ile subject_groups'u da güncelle;
// subject-groups.test.ts migration'lardaki listeyi buradakiyle karşılaştırır.
//
// Geometri, matematik grubunda: YKS'de Temel Matematik ve AYT Matematik
// testlerinin parçası, trigonometri gibi bilgiler AYT Matematik'te.
// Listede olmayan ders kendi başına bir gruptur.

export const SUBJECT_GROUPS = {
  matematik: ["TYT Matematik", "AYT Matematik", "TYT Geometri", "AYT Geometri"],
  fizik: ["TYT Fizik", "AYT Fizik"],
  kimya: ["TYT Kimya", "AYT Kimya"],
  biyoloji: ["TYT Biyoloji", "AYT Biyoloji"],
  tarih: ["TYT Tarih", "AYT Tarih"],
  cografya: ["TYT Coğrafya", "AYT Coğrafya"],
  felsefe: ["TYT Felsefe", "AYT Felsefe", "AYT Sosyoloji"],
  din: ["TYT Din Kültürü", "AYT Din Kültürü"],
} as const satisfies Record<string, readonly string[]>

/** Dersin grubundaki tüm ders adları (grupta değilse yalnız kendisi). */
export function groupSubjectNames(subjectName: string): string[] {
  for (const names of Object.values(SUBJECT_GROUPS)) {
    if ((names as readonly string[]).includes(subjectName)) return [...names]
  }
  return [subjectName]
}
