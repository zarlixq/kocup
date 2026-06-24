-- ─────────────────────────────────────────────────────────────────────────
-- CATCH-UP: canlıda elle uygulanmış şema değişikliklerini repoya yansıt.
-- Idempotent — objeler canlıda zaten varsa no-op; fresh DB'de oluşturur.
-- ─────────────────────────────────────────────────────────────────────────

-- subjects: müfredat türü (normal/maarif) + sınıf
alter table public.subjects add column if not exists curriculum text not null default 'normal';
alter table public.subjects add column if not exists grade smallint;

-- applications.grade: 5 ve 6. sınıf dahil (LGS segmenti genişletildi)
alter table public.applications drop constraint if exists applications_grade_check;
alter table public.applications add constraint applications_grade_check
  check (grade in ('5', '6', '7', '8', '9', '10', '11', '12', 'Mezun'));

-- Öğrencinin kendi koçunun profilini okuyabilmesi için helper + policy
create or replace function public.my_coach_id()
returns uuid language sql stable security definer
set search_path = public
as $$ select coach_id from public.students where id = auth.uid() $$;

drop policy if exists "profiles_select_my_coach" on public.profiles;
create policy "profiles_select_my_coach" on public.profiles
  for select using (id = public.my_coach_id());
