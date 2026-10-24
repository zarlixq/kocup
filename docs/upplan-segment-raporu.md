# UpPlan: sınıf bazlı segmentler + Maarif müfredatı + haftalık program kalitesi — rapor

Tarih: 24-25.10.2026 · Supabase `ibvgnmtrbfezjsrluflz` · Ayrıntılı müfredat kontrolü: [mufredat-kontrol.md](./mufredat-kontrol.md)

## 1. Uygulanan migration'lar

| Migration | Amaç |
|---|---|
| `227_upplan_track_segment` | Profile `graduation_year / track / target_exam_year / alan_egilimi / kept_topic_ids`; tek kaynak SQL fonksiyonları (`upplan_track_for`, `upplan_grade_for`, `upplan_edu_end_year`, `upplan_graduation_year_for`), track trigger'ı ve `upplan_refresh_tracks()`; `exam_calendar`, `school_calendar_weeks/breaks`, `topic_yks_map`, `topic_replacements`, `upplan_archive`, `upplan_feedback`, `upplan_week_ratings`; topics/subjects meta kolonları; ~60 track/kalite katsayısı; backfill |
| `228_maarif_curriculum_apply` | `maarif_apply_curriculum(jsonb)` + `move_topic_refs` — silmeden seed, eski konu pasif + referans taşıma |
| `229_upplan_track_config_extra` | Maarif önceliği ve alan eğilimi katsayıları |
| `230_upplan_short_review_min` | Kısa tekrar en kısa süre (25 dk) |
| `231_upplan_superseded_status` | Yol haritası / program taslağına `superseded` durumu |

Müfredat verisi `node scripts/maarif/build-seed.mjs --apply` ile (service role, 228'deki fonksiyon) uygulandı; ders başına inceleme dosyaları `supabase/seed/maarif/seed_maarif_<sinif>_<ders>.sql`.

## 2. Eklenen konular (458 konu, 32 ders)

Ders/sınıf tablosu ve kaynak linkleri: [mufredat-kontrol.md](./mufredat-kontrol.md#dersınıf-başına-konu-sayısı-toplam-458). Özet: 9. sınıf 156, 10. sınıf 146, 11. sınıf 156 konu. Pasife alınan eski konu: 63 (9 Mat 10, 9 Bio 2, 9 Edebiyat 48, 10 Mat 1, 10 Fizik 2). Yetim konu ve çözülemeyen YKS eşlemesi: 0.

## 3. Öğretmene sorulacaklar

[mufredat-kontrol.md → Öğretmene sorulacaklar](./mufredat-kontrol.md) ve "Emin olunmayan TYT/AYT eşlemeleri" (güç < 0,5) tablosu. Öne çıkanlar: 2026 TDE'nin tema temelli yapısında dil bilgisi konularının yeri; 9. sınıf Biyoloji "Hücreden Doku / Organ" konularının planda olmaması; 11. sınıf Mantık/Psikoloji'nin sınıfı; yazılı haftaları (tahmini).

## 4. Yeniden üretilen yol haritaları (Faz D)

3 Maarif yol haritası `superseded` olarak arşivlendi: 2'si (11. sınıf) yeni algoritmayla taslak olarak üretildi; 9. sınıf öğrencisinin müsaitliği boş olduğu için fail-loud — yeni harita üretilmedi, eksik adım panelde. 688 ilerlemesiz TYT/AYT hedefi `iptal` (id'ler arşivde). 12. sınıf ve mezun planlarına dokunulmadı.

## 5. Test sonuçları

- `npm test`: 28 dosya, 270 test geçti (yeni: `tests/upplan/tracks.test.ts` golden + invariant, `tests/upplan/weekly-quality.test.ts` C2 kuralları, `lib/upplan/scheduler.test.ts` güncellendi).
- `npm run type-check` temiz; `npm run build` başarılı; değişen dosyalarda lint temiz (depodaki 21 lint hatası dokunulmamış dosyalarda, önceden var).
- Canlı karşılaştırma (yazmasız, `tests/upplan/live/compare.local.test.ts`), kurucu haftası 26.10:

| | Önce | Sonra |
|---|---|---|
| Konu+video / soru / tekrar+analiz | %92 / %8 / %0 | %38,7 / %45,3 / %16 |
| AYT Matematik | 0 | 480 dk, 4 gün, günün ilk saatleri |
| TYT Din Kültürü | 180 dk | 30 dk |
| Deneme sonrası analiz | yok | ertesi gün 50 dk |
| Günlük paragraf + problem | yok | her gün 20+20 dk |
| Kural uyarısı | — | yok |

Yan etki: konu payı tavanı (%40) nedeniyle 415 dk playlist videosu bu haftaya sığmadı (taşma raporlanır).

## 6. Verilen kararlar

- Track önbellek kolonu; doğrusu her zaman `trackFor(graduation_year, bugün)`. Yıl dönümünde haftalık cron `upplan_refresh_tracks()` çağırır. Eğitim yılı Temmuz'da döner.
- 2027-28 için `maarif_12` track'i eklendi (şimdilik eski_12 kurallarıyla); LGS öğrencileri `lgs` track'inde eski akışta.
- Track'in haftalık saat üst sınırı (ör. 9: 10 sa) güvenlik sınırı olarak uygulanır; alt sınır öneridir.
- YKS 2028-2030 tarihleri ve yazılı haftaları tahmini (`tahmini=true`).
- Maarif track'lerinde deneme planlanmaz; 11'de haftalık bağlam temelli blok, mezun 2028+ seçerse de.
- 12/mezunda AYT kilidi konu bazlı; ön koşul yalnız gerçekten zayıfsa (< 40) bekletir.
- Kullanıcı hedefi ×1,3 bonus + haftada en az bir blok; UpPlan'ın ilerlemesiz eski hedefi yeniden sıralanır.
- İskelet (paragraf/problem) ders/gün 2 blok sınırına sayılmaz; iskelet ve videolar günün sonuna, ağır sayısal bloklar başına yerleşir.
- "Zamanım yok" geri bildiriminde blok kaldırılır (yenisi konmaz).
- Onboarding: driver.js 1.3.6 (sürüm sabit); durum `user_ui_preferences` scope `onboarding`.
- Müfredat seed'i migration yerine migration'daki fonksiyon + script ile (veri büyüklüğü); SQL dosyaları inceleme ve yeniden uygulama için.

## 7. Ertelenenler

LGS 7-8 track'leri; Hazırlık sınıfı; Fen/Sosyal Bilimler lisesi planları; 11. sınıf Temel Matematik; YDT (dil alanı) konuları; video taşmasında playlist planının otomatik kaydırılması; yeni ekranların tarayıcıda oturum açılarak gözden geçirilmesi.
