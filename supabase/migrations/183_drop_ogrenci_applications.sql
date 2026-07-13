-- Öğrenci başvuruları gerçekte `applications` tablosuna (mevcut /basvuru formu) akıyor
-- ve kendi "Bireysel Başvurular" paneli var. Bu yüzden yeni panelden Öğrenci sekmesi
-- kaldırıldı; kullanılmayan ogrenci_applications tablosu düşürülüyor.
drop table if exists public.ogrenci_applications;
