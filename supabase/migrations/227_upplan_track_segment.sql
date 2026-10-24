-- ─────────────────────────────────────────────────────────────────────────
-- 227 — UpPlan sınıf bazlı segment (track), sınav/okul takvimi, Maarif ↔ YKS
--        eşlemesi, geri bildirim tabloları, track katsayıları
-- ─────────────────────────────────────────────────────────────────────────
-- Track graduation_year + bugünün eğitim yılından türetilir (upplan_track_for):
-- sınıf atlama otomatik; 12 bitince 'mezun'. students.grade (text) yalnız
-- backfill için okunur. Track kolonu önbellektir: trigger graduation_year
-- değişince, upplan_refresh_tracks() (haftalık cron) yıl dönünce günceller.
-- Katsayılar lib/upplan/config.ts UPPLAN_TRACK_SQL_CONFIG ile senkron
-- (config.test.ts).
-- ─────────────────────────────────────────────────────────────────────────

-- ── 1) Katsayılar ────────────────────────────────────────────────────────
insert into public.upplan_config (key, value, note) values
  ('edu_year_rollover_month', 7, 'Eğitim yılı bu aydan itibaren bir sonraki yıla geçer (Temmuz)'),
  ('first_maarif_graduation_year', 2028, 'Maarif modelli ilk mezuniyet / YKS yılı'),
  ('track_maarif_9_hours_min', 6, 'maarif_9 varsayılan haftalık ek çalışma alt sınırı (saat)'),
  ('track_maarif_9_hours_max', 10, 'maarif_9 varsayılan haftalık ek çalışma üst sınırı (saat)'),
  ('track_maarif_10_hours_min', 8, 'maarif_10 haftalık alt sınır (saat)'),
  ('track_maarif_10_hours_max', 12, 'maarif_10 haftalık üst sınır (saat)'),
  ('track_maarif_11_hours_min', 12, 'maarif_11 haftalık alt sınır (saat)'),
  ('track_maarif_11_hours_max', 18, 'maarif_11 haftalık üst sınır (saat)'),
  ('track_eski_12_hours_min', 20, 'eski_12 haftalık alt sınır (saat)'),
  ('track_eski_12_hours_max', 30, 'eski_12 haftalık üst sınır (saat)'),
  ('track_mezun_hours_min', 35, 'mezun haftalık alt sınır (saat)'),
  ('track_mezun_hours_max', 45, 'mezun haftalık üst sınır (saat)'),
  ('limit_maarif_9_daily_max_min', 180, 'maarif_9 günlük en fazla çalışma (dk)'),
  ('limit_maarif_10_daily_max_min', 210, 'maarif_10 günlük en fazla çalışma (dk)'),
  ('limit_maarif_11_daily_max_min', 300, 'maarif_11 günlük en fazla çalışma (dk)'),
  ('limit_eski_12_daily_max_min', 360, 'eski_12 günlük en fazla çalışma (dk)'),
  ('limit_mezun_daily_max_min', 540, 'mezun günlük en fazla çalışma (dk)'),
  ('limit_maarif_9_school_day_max_min', 120, 'maarif_9 okul günü en fazla ek çalışma (dk)'),
  ('limit_maarif_10_school_day_max_min', 120, 'maarif_10 okul günü en fazla ek çalışma (dk)'),
  ('limit_maarif_11_school_day_max_min', 180, 'maarif_11 okul günü en fazla ek çalışma (dk)'),
  ('limit_eski_12_school_day_max_min', 240, 'eski_12 okul günü en fazla ek çalışma (dk)'),
  ('limit_mezun_school_day_max_min', 540, 'mezun: okul yok, günlük sınır geçerli (dk)'),
  ('limit_maarif_9_free_half_days', 2, 'maarif_9 haftada en az boş yarım gün (2 = 1 tam gün)'),
  ('limit_maarif_10_free_half_days', 2, 'maarif_10 haftada en az boş yarım gün'),
  ('limit_maarif_11_free_half_days', 2, 'maarif_11 haftada en az boş yarım gün'),
  ('limit_eski_12_free_half_days', 1, 'eski_12 haftada en az boş yarım gün'),
  ('limit_mezun_free_half_days', 1, 'mezun haftada en az boş yarım gün'),
  ('holiday_load_multiplier', 1.35, 'Yarıyıl/ara tatilde haftalık yük çarpanı'),
  ('exam_week_school_weight', 1.5, 'Yazılı haftasında okul konusu öncelik çarpanı'),
  ('school_ahead_weeks', 2, 'Okul takibi: kaç hafta önden gidilir'),
  ('school_proximity_decay_weeks', 4, 'Okul haftası yakınlığı: bu kadar hafta uzaklıkta öncelik yarıya iner'),
  ('maarif_w_school', 1, 'Maarif öncelik: okul haftası yakınlığı ağırlığı'),
  ('maarif_w_gap', 1, 'Maarif öncelik: ustalık açığı ağırlığı'),
  ('maarif_w_yks', 1, 'Maarif öncelik (11): eşlenen YKS konusunun ağırlığı'),
  ('maarif_11_ayt_from_week', 19, '11. sınıfta AYT eşlemeleri bu okul haftasından (2. dönem) itibaren sayılır'),
  ('maarif_10_tyt_habit_from_week', 19, '10. sınıfta TYT temel alışkanlık bloğu bu okul haftasından itibaren'),
  ('maarif_habit_minutes', 15, 'Maarif günlük alışkanlık bloğu (paragraf / problem) süresi (dk)'),
  ('maarif_habit_days', 5, 'Maarif alışkanlık bloklarının haftalık gün sayısı'),
  ('context_block_minutes', 30, '11: bağlam temelli soru bloğu süresi (dk)'),
  ('context_blocks_per_week', 1, '11: haftalık bağlam temelli soru bloğu sayısı'),
  ('lowvalue_cap_ratio', 0.08, 'Alan dışı (düşük getirili) derslerin haftalık süre tavanı (oran)'),
  ('lowvalue_block_min', 25, 'Düşük getirili ders bloğu en kısa (dk)'),
  ('lowvalue_block_max', 40, 'Düşük getirili ders bloğu en uzun (dk)'),
  ('skeleton_problem_minutes', 20, 'Günlük iskelet: TYT problem / temel matematik soru bloğu (dk)'),
  ('skeleton_paragraf_minutes', 20, 'Günlük iskelet: paragraf soru bloğu (dk)'),
  ('ayt_core_min_days', 4, 'Alanın ana AYT dersi (sayısalda AYT Matematik) haftada en az kaç gün'),
  ('konu_soru_max_gap_days', 2, 'Konu/video bloğundan sonra aynı konunun soru bloğu en geç (gün, 48 saat)'),
  ('ratio_konu_max', 0.40, 'Haftalık süre: konu/video payı üst sınırı'),
  ('ratio_soru_min', 0.45, 'Haftalık süre: soru payı alt sınırı'),
  ('ratio_tekrar_min', 0.15, 'Haftalık süre: tekrar + analiz payı alt sınırı'),
  ('short_review_minutes', 30, 'Kısa tekrar bloğu süresi (dk)'),
  ('soru_block_min_minutes', 30, 'Soru bloğu en kısa (dk)'),
  ('video_min_chunk_minutes', 20, 'Video bloğu en kısa (dk), daha kısa parçalar birleştirilir / taşınır'),
  ('exam_analysis_minutes', 50, 'Deneme ertesi analiz + yanlış defteri bloğu (dk)'),
  ('exam_analysis_bonus', 1.25, 'Denemede zayıf çıkan konuya sonraki hafta öncelik çarpanı'),
  ('user_goal_bonus', 1.3, 'Öğrencinin/koçun eklediği konuya öncelik çarpanı (override değil)'),
  ('rank_pressure_boost', 0.5, 'Hedef sıralama baskısının AYT derslerine en fazla ek ağırlığı'),
  ('rank_reference_max', 200000, 'Baskı hesabında en rahat sıralama'),
  ('rank_reference_min', 1000, 'Baskı hesabında en iddialı sıralama'),
  ('subject_gap_floor', 0.15, 'Ders ustalık açığı alt sınırı (iyi bildiği ders sıfıra düşmesin)'),
  ('feedback_penalty', 0.85, 'Öğrenci "sıkıcı" dediği konuya öncelik çarpanı'),
  ('feedback_penalty_days', 14, 'Geri bildirim cezasının geçerli olduğu gün')
on conflict (key) do nothing;

create or replace function public.upplan_cfg(p_key text)
returns numeric
language sql
stable
set search_path = public
as $$ select value from public.upplan_config where key = p_key $$;

-- ── 2) Track fonksiyonları (TEK KAYNAK; TS aynası lib/upplan/track.ts) ──
create or replace function public.upplan_today()
returns date
language sql
stable
as $$ select (now() at time zone 'Europe/Istanbul')::date $$;

-- Eğitim yılının bittiği takvim yılı (2026-10 → 2027; 2027-07 → 2028).
create or replace function public.upplan_edu_end_year(p_on date default public.upplan_today())
returns smallint
language sql
stable
set search_path = public
as $$
  select (extract(year from p_on)::int
    + case when extract(month from p_on) >= coalesce(public.upplan_cfg('edu_year_rollover_month'), 7) then 1 else 0 end)::smallint
$$;

-- Sınıf (9..12); mezunda > 12.
create or replace function public.upplan_grade_for(p_graduation_year smallint, p_on date default public.upplan_today())
returns smallint
language sql
stable
set search_path = public
as $$
  select case when p_graduation_year is null then null
    else (12 - (p_graduation_year - public.upplan_edu_end_year(p_on)))::smallint end
$$;

create or replace function public.upplan_track_for(p_graduation_year smallint, p_on date default public.upplan_today())
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  g int := public.upplan_grade_for(p_graduation_year, p_on);
begin
  if g is null then return null; end if;
  if g > 12 then return 'mezun'; end if;
  if g = 12 then
    return case when p_graduation_year >= public.upplan_cfg('first_maarif_graduation_year') then 'maarif_12' else 'eski_12' end;
  end if;
  if g between 9 and 11 then return 'maarif_' || g; end if;
  if g between 5 and 8 then return 'lgs'; end if;
  return null;
end $$;

-- students.grade ("5".."12" | "Mezun") → mezuniyet yılı (backfill / yeni kayıt).
create or replace function public.upplan_graduation_year_for(p_grade text, p_on date default public.upplan_today())
returns smallint
language sql
stable
set search_path = public
as $$
  select case
    when p_grade is null then null
    when p_grade = 'Mezun' then (public.upplan_edu_end_year(p_on) - 1)::smallint
    when p_grade ~ '^\d{1,2}$' and p_grade::int between 5 and 12 then (public.upplan_edu_end_year(p_on) + 12 - p_grade::int)::smallint
    else null end
$$;

-- ── 3) Profil kolonları ──────────────────────────────────────────────────
alter table public.student_upplan_profile
  add column if not exists graduation_year smallint,
  add column if not exists track text,
  add column if not exists target_exam_year smallint,
  add column if not exists alan_egilimi text,
  add column if not exists kept_topic_ids uuid[] not null default '{}';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'student_upplan_profile_track_check' and conrelid = 'public.student_upplan_profile'::regclass) then
    alter table public.student_upplan_profile add constraint student_upplan_profile_track_check
      check (track is null or track in ('maarif_9', 'maarif_10', 'maarif_11', 'maarif_12', 'eski_12', 'mezun', 'lgs'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'student_upplan_profile_graduation_year_check' and conrelid = 'public.student_upplan_profile'::regclass) then
    alter table public.student_upplan_profile add constraint student_upplan_profile_graduation_year_check
      check (graduation_year is null or graduation_year between 2000 and 2040);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'student_upplan_profile_target_exam_year_check' and conrelid = 'public.student_upplan_profile'::regclass) then
    alter table public.student_upplan_profile add constraint student_upplan_profile_target_exam_year_check
      check (target_exam_year is null or target_exam_year between 2026 and 2040);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'student_upplan_profile_alan_egilimi_check' and conrelid = 'public.student_upplan_profile'::regclass) then
    alter table public.student_upplan_profile add constraint student_upplan_profile_alan_egilimi_check
      check (alan_egilimi is null or alan_egilimi in ('sayisal', 'ea', 'sozel', 'dil'));
  end if;
end $$;

-- Alan zorunluluğu artık track'e bağlı: 9-10'da alan yok (alan_egilimi opsiyonel).
alter table public.student_upplan_profile drop constraint if exists student_upplan_profile_alan_required;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'student_upplan_profile_alan_by_track' and conrelid = 'public.student_upplan_profile'::regclass) then
    alter table public.student_upplan_profile add constraint student_upplan_profile_alan_by_track check (
      case
        when track in ('maarif_9', 'maarif_10') then alan is null
        when track in ('maarif_11', 'maarif_12', 'eski_12', 'mezun') then alan is not null
        else true
      end);
  end if;
end $$;

-- Trigger: graduation_year → track, sınıf, segment, durum; 9-10'da alan null.
create or replace function public.upplan_profile_sync_track()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  g smallint;
begin
  if new.graduation_year is null then
    if new.status = 'mezun' then
      new.graduation_year := public.upplan_edu_end_year() - 1;
    elsif new.grade is not null then
      new.graduation_year := public.upplan_edu_end_year() + 12 - new.grade;
    end if;
  end if;
  new.track := public.upplan_track_for(new.graduation_year);
  g := public.upplan_grade_for(new.graduation_year);
  if new.track is null then
    return new;
  end if;
  if new.track = 'mezun' then
    new.grade := null;
    if new.status = 'lise' then new.status := 'mezun'; end if;
  else
    new.grade := g;
    if new.status = 'mezun' then new.status := 'lise'; end if;
  end if;
  new.segment := case when new.track = 'lgs' then 'lgs' else 'yks' end;
  if new.track in ('maarif_9', 'maarif_10') then
    new.alan := null;
  else
    new.alan_egilimi := null;
  end if;
  return new;
end $$;

create or replace trigger upplan_profile_sync_track
  before insert or update of graduation_year, grade, status on public.student_upplan_profile
  for each row execute function public.upplan_profile_sync_track();

-- Yıl dönümü: önbellek track'i yeniler (haftalık cron çağırır). Dönen: değişen satır.
create or replace function public.upplan_refresh_tracks()
returns integer
language plpgsql
set search_path = public
as $$
declare
  n integer;
begin
  update public.student_upplan_profile p
     set graduation_year = p.graduation_year
   where p.graduation_year is not null
     and p.track is distinct from public.upplan_track_for(p.graduation_year);
  get diagnostics n = row_count;
  return n;
end $$;

-- ── 4) Sınav takvimi ─────────────────────────────────────────────────────
create table if not exists public.exam_calendar (
  exam_type text not null check (exam_type in ('yks', 'lgs')),
  exam_year smallint not null,
  exam_date date not null,
  question_style text not null check (question_style in ('klasik', 'baglam_temelli')),
  tahmini boolean not null default true,
  source_url text,
  note text,
  primary key (exam_type, exam_year)
);
alter table public.exam_calendar enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'exam_calendar' and policyname = 'exam_calendar_select') then
    create policy exam_calendar_select on public.exam_calendar for select to authenticated using (true);
  end if;
end $$;
insert into public.exam_calendar (exam_type, exam_year, exam_date, question_style, tahmini, source_url, note) values
  ('yks', 2027, '2027-06-19', 'klasik', true, null, 'Önceki kod sabiti (EXAM_DATES); ÖSYM takvimi açıklanınca güncelle'),
  ('yks', 2028, '2028-06-17', 'baglam_temelli', true, 'https://www.meb.gov.tr', 'Maarif modelli ilk YKS; TYT/AYT yapısı aynı, sorular beceri/bağlam temelli'),
  ('yks', 2029, '2029-06-16', 'baglam_temelli', true, null, 'Tahmini (Haziran 3. hafta sonu)'),
  ('yks', 2030, '2030-06-15', 'baglam_temelli', true, null, 'Tahmini (Haziran 3. hafta sonu)'),
  ('lgs', 2027, '2027-06-13', 'klasik', true, null, 'Önceki kod sabiti (EXAM_DATES)')
on conflict (exam_type, exam_year) do nothing;

-- ── 5) Okul takvimi (ders haftaları; tatil haftaları sayılmaz) ───────────
create table if not exists public.school_calendar_weeks (
  edu_year text not null,
  week_no smallint not null,
  starts_on date not null,
  is_exam_week boolean not null default false,
  primary key (edu_year, week_no)
);
create table if not exists public.school_calendar_breaks (
  edu_year text not null,
  kind text not null check (kind in ('ara_tatil', 'yariyil', 'yaz')),
  starts_on date not null,
  ends_on date not null,
  primary key (edu_year, kind, starts_on)
);
alter table public.school_calendar_weeks enable row level security;
alter table public.school_calendar_breaks enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'school_calendar_weeks' and policyname = 'school_calendar_weeks_select') then
    create policy school_calendar_weeks_select on public.school_calendar_weeks for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'school_calendar_breaks' and policyname = 'school_calendar_breaks_select') then
    create policy school_calendar_breaks_select on public.school_calendar_breaks for select to authenticated using (true);
  end if;
end $$;

-- 2026-27 MEB çerçeve yıllık planlarındaki hafta etiketleri (1. Hafta 14-18 Eylül ...).
-- Yazılı haftaları planlarda yok: dönem ortası ve sonu tahmini (7-8, 15-16, 26-27, 33-34).
insert into public.school_calendar_weeks (edu_year, week_no, starts_on, is_exam_week)
select '2026-2027', w.n, w.d::date, w.n in (7, 8, 15, 16, 26, 27, 33, 34)
from (values
  (1, '2026-09-14'), (2, '2026-09-21'), (3, '2026-09-28'), (4, '2026-10-05'), (5, '2026-10-12'),
  (6, '2026-10-19'), (7, '2026-10-26'), (8, '2026-11-02'), (9, '2026-11-09'), (10, '2026-11-23'),
  (11, '2026-11-30'), (12, '2026-12-07'), (13, '2026-12-14'), (14, '2026-12-21'), (15, '2026-12-28'),
  (16, '2027-01-04'), (17, '2027-01-11'), (18, '2027-01-18'), (19, '2027-02-08'), (20, '2027-02-15'),
  (21, '2027-02-22'), (22, '2027-03-01'), (23, '2027-03-15'), (24, '2027-03-22'), (25, '2027-03-29'),
  (26, '2027-04-05'), (27, '2027-04-12'), (28, '2027-04-19'), (29, '2027-04-26'), (30, '2027-05-03'),
  (31, '2027-05-10'), (32, '2027-05-17'), (33, '2027-05-24'), (34, '2027-05-31'), (35, '2027-06-07'),
  (36, '2027-06-14'), (37, '2027-06-21')
) as w(n, d)
on conflict (edu_year, week_no) do nothing;

insert into public.school_calendar_breaks (edu_year, kind, starts_on, ends_on) values
  ('2026-2027', 'ara_tatil', '2026-11-16', '2026-11-20'),
  ('2026-2027', 'yariyil', '2027-01-25', '2027-02-05'),
  ('2026-2027', 'ara_tatil', '2027-03-08', '2027-03-12'),
  ('2026-2027', 'yaz', '2027-06-26', '2027-09-12')
on conflict (edu_year, kind, starts_on) do nothing;

-- ── 6) Konu meta + ders anahtarı ─────────────────────────────────────────
alter table public.topics
  add column if not exists school_week smallint,
  add column if not exists unit text,
  add column if not exists source_url text,
  add column if not exists curriculum_version text;
alter table public.subjects add column if not exists ders_key text;

-- ── 7) Maarif → YKS eşlemesi ve eski → yeni konu eşlemesi ────────────────
create table if not exists public.topic_yks_map (
  maarif_topic_id uuid not null references public.topics(id) on delete cascade,
  yks_topic_id uuid not null references public.topics(id) on delete cascade,
  strength numeric not null check (strength > 0 and strength <= 1),
  primary key (maarif_topic_id, yks_topic_id)
);
create index if not exists topic_yks_map_yks_idx on public.topic_yks_map (yks_topic_id);

create table if not exists public.topic_replacements (
  old_topic_id uuid primary key references public.topics(id) on delete cascade,
  new_topic_id uuid not null references public.topics(id) on delete cascade,
  reason text not null default 'tymm-2026',
  created_at timestamptz not null default now()
);

alter table public.topic_yks_map enable row level security;
alter table public.topic_replacements enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'topic_yks_map' and policyname = 'topic_yks_map_select') then
    create policy topic_yks_map_select on public.topic_yks_map for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'topic_replacements' and policyname = 'topic_replacements_select') then
    create policy topic_replacements_select on public.topic_replacements for select to authenticated using (true);
  end if;
end $$;

-- ── 8) Arşiv (superseded yol haritası / program taslağı) ─────────────────
-- upplan_roadmaps tek satır/öğrenci (PK student_id); eski taslak buraya
-- status='superseded' ile kopyalanır, sonra yeni taslak üretilir.
create table if not exists public.upplan_archive (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('roadmap', 'program')),
  week_start date,
  status text not null default 'superseded' check (status in ('superseded')),
  previous_status text not null,
  payload jsonb not null,
  generated_at timestamptz,
  archived_at timestamptz not null default now(),
  reason text not null
);
create index if not exists upplan_archive_student_idx on public.upplan_archive (student_id, archived_at desc);
alter table public.upplan_archive enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'upplan_archive' and policyname = 'upplan_archive_read') then
    create policy upplan_archive_read on public.upplan_archive for select using (
      student_id = auth.uid() or public.is_coach_of(student_id) or public.current_user_role() = 'admin'
    );
  end if;
end $$;

-- ── 9) Bildirim türü: program güncellendi ───────────────────────────────
alter table public.upplan_notifications drop constraint if exists upplan_notifications_kind_check;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'upplan_notifications_kind_check2' and conrelid = 'public.upplan_notifications'::regclass) then
    alter table public.upplan_notifications add constraint upplan_notifications_kind_check2
      check (kind in ('kayma', 'zaman_kalirsa', 'yeni_hafta', 'erken_acildi', 'yuk_azaldi', 'program_guncellendi'));
  end if;
end $$;

-- ── 10) Öğrenci geri bildirimi (Faz C3) ──────────────────────────────────
create table if not exists public.upplan_feedback (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  topic_id uuid references public.topics(id) on delete set null,
  subject_id uuid references public.subjects(id) on delete set null,
  block_type text,
  reason text not null check (reason in ('biliyorum', 'cok_zor', 'sikici', 'zamanim_yok', 'yanlis_ders')),
  track text,
  created_at timestamptz not null default now()
);
create index if not exists upplan_feedback_student_idx on public.upplan_feedback (student_id, created_at desc);

create table if not exists public.upplan_week_ratings (
  student_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or length(comment) <= 1000),
  track text,
  created_at timestamptz not null default now(),
  primary key (student_id, week_start)
);

alter table public.upplan_feedback enable row level security;
alter table public.upplan_week_ratings enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'upplan_feedback' and policyname = 'upplan_feedback_read') then
    create policy upplan_feedback_read on public.upplan_feedback for select using (
      student_id = auth.uid() or public.is_coach_of(student_id) or public.current_user_role() = 'admin');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'upplan_feedback' and policyname = 'upplan_feedback_insert_own') then
    create policy upplan_feedback_insert_own on public.upplan_feedback for insert with check (student_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'upplan_week_ratings' and policyname = 'upplan_week_ratings_read') then
    create policy upplan_week_ratings_read on public.upplan_week_ratings for select using (
      student_id = auth.uid() or public.is_coach_of(student_id) or public.current_user_role() = 'admin');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'upplan_week_ratings' and policyname = 'upplan_week_ratings_upsert_own') then
    create policy upplan_week_ratings_upsert_own on public.upplan_week_ratings for insert with check (student_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'upplan_week_ratings' and policyname = 'upplan_week_ratings_update_own') then
    create policy upplan_week_ratings_update_own on public.upplan_week_ratings for update using (student_id = auth.uid()) with check (student_id = auth.uid());
  end if;
end $$;

-- ── 11) Backfill: mezuniyet yılı (trigger track/sınıf/alan'ı türetir) ────
update public.student_upplan_profile p
   set graduation_year = coalesce(
         case when p.grade is not null then public.upplan_edu_end_year() + 12 - p.grade end,
         public.upplan_graduation_year_for((select s.grade from public.students s where s.id = p.student_id)),
         case when p.status = 'mezun' then public.upplan_edu_end_year() - 1 end)
 where p.graduation_year is null;
