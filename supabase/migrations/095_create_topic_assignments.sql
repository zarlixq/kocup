-- ─────────────────────────────────────────────────────────────────────────
-- TOPIC_ASSIGNMENTS — Koçun öğrenciye verdiği hedefli konu ataması
-- (Mevcut student_topics basit durum tutar; bu yeni tablo hedef+deadline'lı.)
-- ─────────────────────────────────────────────────────────────────────────

create type public.assignment_status as enum ('aktif', 'tamamlandi', 'iptal');

create table public.topic_assignments (
  id uuid primary key default gen_random_uuid(),

  coach_id   uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  topic_id   uuid not null references public.topics(id) on delete cascade,

  hedef_soru     integer not null check (hedef_soru > 0),
  hedef_sure_dk  integer check (hedef_sure_dk is null or hedef_sure_dk > 0),

  baslangic_tarihi date not null default current_date,
  son_tarih        date not null,

  notes  text,
  status public.assignment_status not null default 'aktif',

  created_by uuid not null references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint topic_assignments_dates_check check (son_tarih >= baslangic_tarihi)
);

create index on public.topic_assignments (student_id, status);
create index on public.topic_assignments (coach_id);
create index on public.topic_assignments (topic_id);
create index on public.topic_assignments (son_tarih);

create trigger trg_topic_assignments_updated_at
  before update on public.topic_assignments
  for each row execute function public.set_updated_at();

-- RLS
alter table public.topic_assignments enable row level security;

-- Koç kendi atadığı satırları yönetir
create policy "topic_assignments_coach_all" on public.topic_assignments
  for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- Öğrenci kendine atanmış satırları okur
create policy "topic_assignments_student_read" on public.topic_assignments
  for select
  using (student_id = auth.uid());

-- Admin (müdür) her şeyi yönetir
create policy "topic_assignments_admin_all" on public.topic_assignments
  for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
