-- ─────────────────────────────────────────────────────────────────────────
-- 211 — UpPlan Faz B: konu yol haritası + haftalık program
-- ─────────────────────────────────────────────────────────────────────────
-- Planlama saf TS'dedir (lib/upplan/roadmap.ts, scheduler.ts). Bu migration
-- yalnız veri yapısını kurar; hiçbir satır silmez/değiştirmez.
--
--   topic_exam_weights      konu × sınav ortalama soru (global, service role yazar)
--   topic_assignments       + plan_order, wave, block_type, origin('upplan')
--   assignment_status       + 'sirada', 'zaman_kalirsa'
--   weekly_program_items    + assignment_id (hedefe link), block_type
--   upplan_roadmaps         öğrenci başına yol haritası taslağı / onayı (jsonb)
--   upplan_program_drafts   öğrenci × hafta program taslağı (jsonb)
--   upplan_notifications    büyük değişiklik bildirimleri
--   student_upplan_profile  + load_factor (uyum düşükse yük azaltma), last_weekly_run_at
-- ─────────────────────────────────────────────────────────────────────────

-- ── 1) Konu sınav ağırlıkları ────────────────────────────────────────────
create table if not exists public.topic_exam_weights (
  topic_id uuid not null references public.topics(id) on delete cascade,
  exam text not null check (exam in ('tyt', 'ayt', 'lgs')),
  avg_questions numeric(5, 2) not null check (avg_questions >= 0),
  updated_at timestamptz not null default now(),
  primary key (topic_id, exam)
);

alter table public.topic_exam_weights enable row level security;

drop policy if exists topic_exam_weights_select on public.topic_exam_weights;
create policy topic_exam_weights_select on public.topic_exam_weights
  for select to authenticated using (true);
-- Yazma politikası yok: yalnız service role (scripts/import-topic-exam-weights.mjs).

-- ── 2) Hedef durumları ve yol haritası alanları ──────────────────────────
alter type public.assignment_status add value if not exists 'sirada';
alter type public.assignment_status add value if not exists 'zaman_kalirsa';

alter table public.topic_assignments
  add column if not exists plan_order integer,
  add column if not exists wave integer,
  add column if not exists block_type text,
  add column if not exists origin text;

alter table public.topic_assignments
  drop constraint if exists topic_assignments_block_type_check,
  add constraint topic_assignments_block_type_check
    check (block_type is null or block_type in ('konu_calisma', 'soru_cozum', 'tekrar')),
  drop constraint if exists topic_assignments_origin_check,
  add constraint topic_assignments_origin_check
    check (origin is null or origin = 'upplan'),
  drop constraint if exists topic_assignments_wave_check,
  add constraint topic_assignments_wave_check
    check (wave is null or wave >= 0);

create index if not exists topic_assignments_upplan_idx
  on public.topic_assignments (student_id, plan_order)
  where origin = 'upplan';

-- ── 3) Program kalemi → hedef linki ──────────────────────────────────────
alter table public.weekly_program_items
  add column if not exists assignment_id uuid references public.topic_assignments(id) on delete set null,
  add column if not exists block_type text;

alter table public.weekly_program_items
  drop constraint if exists weekly_program_items_block_type_check,
  add constraint weekly_program_items_block_type_check
    check (block_type is null or block_type in ('konu_calisma', 'soru_cozum', 'tekrar', 'deneme'));

create index if not exists weekly_program_items_assignment_idx
  on public.weekly_program_items (assignment_id) where assignment_id is not null;

-- ── 4) Profil: yük çarpanı ───────────────────────────────────────────────
alter table public.student_upplan_profile
  add column if not exists load_factor numeric(3, 2) not null default 1,
  add column if not exists last_weekly_run_at timestamptz;

alter table public.student_upplan_profile
  drop constraint if exists student_upplan_profile_load_factor_check,
  add constraint student_upplan_profile_load_factor_check check (load_factor > 0 and load_factor <= 1);

-- ── 5) Yol haritası taslağı ──────────────────────────────────────────────
-- status: taslak (öğrenci onayı bekliyor) | onaylandi | koca_onerildi (koçlu öğrenci)
create table if not exists public.upplan_roadmaps (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null check (status in ('taslak', 'onaylandi', 'koca_onerildi')),
  payload jsonb not null,
  generated_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null
);

alter table public.upplan_roadmaps enable row level security;

drop policy if exists upplan_roadmaps_read on public.upplan_roadmaps;
create policy upplan_roadmaps_read on public.upplan_roadmaps
  for select using (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
    or exists (
      select 1 from public.profiles p
       where p.id = upplan_roadmaps.student_id
         and p.organization_id is not null
         and public.is_org_admin_of(p.organization_id)
    )
  );
-- Yazma: yalnız sunucu (service role) — taslak üretimi ve onay server action'da.

-- ── 6) Haftalık program taslağı ──────────────────────────────────────────
create table if not exists public.upplan_program_drafts (
  student_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  status text not null check (status in ('taslak', 'onaylandi', 'reddedildi', 'koca_onerildi')),
  items jsonb not null,
  meta jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete set null,
  primary key (student_id, week_start)
);

alter table public.upplan_program_drafts enable row level security;

drop policy if exists upplan_program_drafts_read on public.upplan_program_drafts;
create policy upplan_program_drafts_read on public.upplan_program_drafts
  for select using (
    student_id = auth.uid()
    or public.is_coach_of(student_id)
    or public.current_user_role() = 'admin'
    or exists (
      select 1 from public.profiles p
       where p.id = upplan_program_drafts.student_id
         and p.organization_id is not null
         and public.is_org_admin_of(p.organization_id)
    )
  );

-- ── 7) Bildirimler ───────────────────────────────────────────────────────
create table if not exists public.upplan_notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('kayma', 'zaman_kalirsa', 'yeni_hafta', 'erken_acildi', 'yuk_azaldi')),
  message text not null check (length(message) <= 500),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists upplan_notifications_student_idx
  on public.upplan_notifications (student_id, created_at desc);

alter table public.upplan_notifications enable row level security;

drop policy if exists upplan_notifications_read on public.upplan_notifications;
create policy upplan_notifications_read on public.upplan_notifications
  for select using (student_id = auth.uid() or public.is_coach_of(student_id) or public.current_user_role() = 'admin');

-- Öğrenci yalnız okundu işaretler (read_at); diğer kolonlar trigger'la kilitli.
drop policy if exists upplan_notifications_mark_read on public.upplan_notifications;
create policy upplan_notifications_mark_read on public.upplan_notifications
  for update using (student_id = auth.uid()) with check (student_id = auth.uid());

create or replace function public.guard_notification_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if (to_jsonb(new) - 'read_at') is distinct from (to_jsonb(old) - 'read_at') then
    raise exception 'Bildirim yalnızca okundu olarak işaretlenebilir.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_upplan_notifications_guard on public.upplan_notifications;
create trigger trg_upplan_notifications_guard
  before update on public.upplan_notifications
  for each row execute function public.guard_notification_update();
