-- ─────────────────────────────────────────────────────────────────────────
-- 216 — UpPlan iyileştirme: öğrenme aşaması, video playlist takibi, gün bazlı uyum
-- ─────────────────────────────────────────────────────────────────────────
-- 1) topic_assignments.learning_phase / learned_at
--      gerekli  : "hiç görmedim" ya da etkili < 40 → önce konuyu öğren, sonra soru
--      opsiyonel: "eksik" → kısa tekrar önerilir, soru aşaması beklemez
--      yok      : doğrudan soru/tekrar
--    learned_at dolunca öğrenme aşaması biter (öğrenci işaretler ya da konunun
--    tüm videoları "izlendi + anladım/kısmen" olur). Yazma uygulamada service
--    role ile, sahiplik doğrulandıktan sonra.
-- 2) student_resource_playlists / student_resource_videos: öğrencinin ders bazlı
--    YouTube playlist'leri ve video ↔ konu eşleşmesi. Video içeriği saklanmaz;
--    yalnız YouTube kimliği, başlık, sıra (telif: link/embed).
-- 3) weekly_program_daily_compliance: gün bazlı uyum için gün × kalem sayımı.
--    Yüzde TS'te tek fonksiyonda (lib/analytics/compliance.ts dailyCompliance).
-- ─────────────────────────────────────────────────────────────────────────

-- ── 1) Öğrenme aşaması ───────────────────────────────────────────────────
alter table public.topic_assignments add column if not exists learning_phase text;
alter table public.topic_assignments add column if not exists learned_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'topic_assignments_learning_phase_check') then
    alter table public.topic_assignments
      add constraint topic_assignments_learning_phase_check
      check (learning_phase is null or learning_phase in ('gerekli', 'opsiyonel', 'yok'));
  end if;
end;
$$;

create or replace function public.upplan_bulk_update_goals(p_student_id uuid, p_rows jsonb)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_n integer;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Geçersiz liste.';
  end if;
  update public.topic_assignments t
     set wave = coalesce(r.wave, t.wave),
         baslangic_tarihi = coalesce(r.baslangic_tarihi, t.baslangic_tarihi),
         son_tarih = coalesce(r.son_tarih, t.son_tarih),
         status = coalesce(r.status::public.assignment_status, t.status),
         plan_order = coalesce(r.plan_order, t.plan_order),
         block_type = coalesce(r.block_type, t.block_type),
         hedef_soru = coalesce(r.hedef_soru, t.hedef_soru),
         hedef_dogruluk = coalesce(r.hedef_dogruluk, t.hedef_dogruluk),
         notes = coalesce(r.notes, t.notes),
         learning_phase = coalesce(r.learning_phase, t.learning_phase)
    from jsonb_to_recordset(p_rows) as r(
      id uuid, wave integer, baslangic_tarihi date, son_tarih date, status text,
      plan_order integer, block_type text, hedef_soru integer, hedef_dogruluk smallint, notes text,
      learning_phase text
    )
   where t.id = r.id
     and t.student_id = p_student_id
     and t.origin = 'upplan';
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- ── 2) Playlist ve videolar ──────────────────────────────────────────────
create table if not exists public.student_resource_playlists (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  teacher_name text not null check (length(trim(teacher_name)) between 1 and 80),
  title text check (title is null or length(title) <= 200),
  youtube_playlist_id text check (youtube_playlist_id is null or youtube_playlist_id ~ '^[A-Za-z0-9_-]{10,64}$'),
  source text not null default 'youtube' check (source in ('youtube', 'manuel')),
  created_at timestamptz not null default now()
);

create index if not exists student_resource_playlists_student_idx on public.student_resource_playlists (student_id);

create table if not exists public.student_resource_videos (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  playlist_id uuid not null references public.student_resource_playlists(id) on delete cascade,
  youtube_video_id text not null check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text not null check (length(trim(title)) between 1 and 200),
  position integer not null default 0,
  topic_id uuid references public.topics(id) on delete set null,
  -- oneri: otomatik eşleşme (öğrenci onaylamadı) · onaylandi · eslesmedi
  match_status text not null default 'eslesmedi' check (match_status in ('oneri', 'onaylandi', 'eslesmedi')),
  match_score numeric(4, 3),
  watch_status text not null default 'izlenmedi' check (watch_status in ('izlenmedi', 'izlendi')),
  understanding text check (understanding is null or understanding in ('anladim', 'kismen', 'anlamadim')),
  watched_at timestamptz,
  created_at timestamptz not null default now(),
  constraint student_resource_videos_playlist_video_key unique (playlist_id, youtube_video_id)
);

create index if not exists student_resource_videos_student_topic_idx on public.student_resource_videos (student_id, topic_id);

-- Videonun öğrencisi playlist'in öğrencisi olmalı.
create or replace function public.student_resource_videos_owner()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select student_id into v_owner from public.student_resource_playlists where id = new.playlist_id;
  if v_owner is null or v_owner <> new.student_id then
    raise exception 'Playlist bulunamadı.' using errcode = '23503';
  end if;
  return new;
end;
$$;

create or replace trigger trg_student_resource_videos_owner
  before insert or update of playlist_id, student_id on public.student_resource_videos
  for each row execute function public.student_resource_videos_owner();

alter table public.student_resource_playlists enable row level security;
alter table public.student_resource_videos enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['student_resource_playlists', 'student_resource_videos'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = t || '_select') then
      execute format(
        'create policy %I on public.%I for select using (
           student_id = auth.uid()
           or public.is_coach_of(student_id)
           or public.current_user_role() = ''admin''
           or exists (select 1 from public.profiles p
                       where p.id = %I.student_id and p.organization_id is not null
                         and public.is_org_admin_of(p.organization_id)))',
        t || '_select', t, t);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = t || '_insert') then
      execute format('create policy %I on public.%I for insert with check (student_id = auth.uid())', t || '_insert', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = t || '_update') then
      execute format('create policy %I on public.%I for update using (student_id = auth.uid()) with check (student_id = auth.uid())', t || '_update', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = t || '_delete') then
      execute format('create policy %I on public.%I for delete using (student_id = auth.uid())', t || '_delete', t);
    end if;
  end loop;
end;
$$;

-- ── 3) Gün bazlı uyum sayımı ─────────────────────────────────────────────
-- SECURITY INVOKER: kapsam RLS ile (müdür tüm, koç kendi öğrencileri, öğrenci kendisi).
create or replace function public.weekly_program_daily_compliance(p_week_start date, p_student_id uuid default null)
returns table(student_id uuid, day_of_week integer, total_items integer, done_items integer)
language sql
stable
set search_path = public
as $$
  select wp.student_id,
         wpi.day_of_week::int,
         count(wpi.id)::int,
         count(wpi.id) filter (where wpi.is_completed)::int
    from public.weekly_programs wp
    join public.weekly_program_items wpi on wpi.program_id = wp.id
   where wp.week_start = p_week_start
     and (p_student_id is null or wp.student_id = p_student_id)
   group by wp.student_id, wpi.day_of_week
$$;

revoke all on function public.weekly_program_daily_compliance(date, uuid) from public, anon;
grant execute on function public.weekly_program_daily_compliance(date, uuid) to authenticated;
