-- Muhasebe modülünün öğrenci listesi tablosunu "clients" olarak yeniden adlandır.
-- Brief'teki panel sisteminin "students" tablosu (auth.users bağlı portal kullanıcıları)
-- ile isim çakışmasını önlemek için gereklidir.

alter table public.students rename to clients;

-- Tablo üzerindeki RLS policy adını güncelle
alter policy "students_all_own" on public.clients rename to "clients_all_own";

-- packages_all_own: USING clause içinde "public.students s" referansı var — drop/recreate
drop policy "packages_all_own" on public.packages;
create policy "packages_all_own" on public.packages for all
  using (exists (
    select 1 from public.clients c
    where c.id = packages.student_id and c.coach_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.clients c
    where c.id = packages.student_id and c.coach_id = auth.uid()
  ));

-- payments_all_own: aynı şekilde
drop policy "payments_all_own" on public.payments;
create policy "payments_all_own" on public.payments for all
  using (exists (
    select 1 from public.clients c
    where c.id = payments.student_id and c.coach_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.clients c
    where c.id = payments.student_id and c.coach_id = auth.uid()
  ));
