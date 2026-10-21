-- ─────────────────────────────────────────────────────────────────────────
-- 223 — Playlist çalışma planı + YouTube önbelleği + bozuk kayıt işareti
-- ─────────────────────────────────────────────────────────────────────────
-- 1) student_resource_playlists
--      channel_title : YouTube kanal adı (hoca etkinliği / liste satırı)
--      issue         : 'kanal_linki' → kanal linkiyle eklenmiş eksik kayıt;
--                      öğrenciye "Düzelt" sunulur (veri silinmez)
--      plan_mode     : gun_yapisi ("N. Gün" kalıbı) · video (günde N video) ·
--                      dakika (günde X dakika) · null = plan yok
--      plan_amount   : N ya da X (gun_yapisi'nda null)
--      plan_start    : plan başlangıç tarihi
--      plan_weekdays : çalışılan günler (1=Pzt..7=Paz)
-- 2) student_resource_videos
--      plan_day      : plan günü sırası (1..) — aynı güne düşen videolar gruplu
--      planned_date  : o grubun tarihi; "Kaydır" ile yeniden hesaplanır
-- 3) youtube_playlist_cache: playlist meta + video listesi (API kotası için).
--    Yalnız sunucu (service role) okur/yazar; RLS açık, politika yok.
-- 4) Mevcut kanal-linki kayıtları issue='kanal_linki' ile işaretlenir.
-- ─────────────────────────────────────────────────────────────────────────

-- ── 1) Playlist ──────────────────────────────────────────────────────────
alter table public.student_resource_playlists add column if not exists channel_title text;
alter table public.student_resource_playlists add column if not exists issue text;
alter table public.student_resource_playlists add column if not exists plan_mode text;
alter table public.student_resource_playlists add column if not exists plan_amount integer;
alter table public.student_resource_playlists add column if not exists plan_start date;
alter table public.student_resource_playlists add column if not exists plan_weekdays smallint[];

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'student_resource_playlists_channel_check') then
    alter table public.student_resource_playlists
      add constraint student_resource_playlists_channel_check check (channel_title is null or length(channel_title) <= 120);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'student_resource_playlists_issue_check') then
    alter table public.student_resource_playlists
      add constraint student_resource_playlists_issue_check check (issue is null or issue in ('kanal_linki'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'student_resource_playlists_plan_mode_check') then
    alter table public.student_resource_playlists
      add constraint student_resource_playlists_plan_mode_check
      check (plan_mode is null or plan_mode in ('gun_yapisi', 'video', 'dakika'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'student_resource_playlists_plan_amount_check') then
    alter table public.student_resource_playlists
      add constraint student_resource_playlists_plan_amount_check check (plan_amount is null or plan_amount between 1 and 600);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'student_resource_playlists_plan_weekdays_check') then
    alter table public.student_resource_playlists
      add constraint student_resource_playlists_plan_weekdays_check
      check (plan_weekdays is null or (cardinality(plan_weekdays) between 1 and 7 and plan_weekdays <@ array[1,2,3,4,5,6,7]::smallint[]));
  end if;
end;
$$;

-- ── 2) Video ─────────────────────────────────────────────────────────────
alter table public.student_resource_videos add column if not exists plan_day integer;
alter table public.student_resource_videos add column if not exists planned_date date;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'student_resource_videos_plan_day_check') then
    alter table public.student_resource_videos
      add constraint student_resource_videos_plan_day_check check (plan_day is null or plan_day between 1 and 1000);
  end if;
end;
$$;

-- Bugün / gecikenler sorgusu.
create index if not exists student_resource_videos_student_planned_idx
  on public.student_resource_videos (student_id, planned_date) where planned_date is not null;

-- ── 3) YouTube önbelleği ─────────────────────────────────────────────────
create table if not exists public.youtube_playlist_cache (
  youtube_playlist_id text primary key check (youtube_playlist_id ~ '^[A-Za-z0-9_-]{10,64}$'),
  title text check (title is null or length(title) <= 200),
  channel_title text check (channel_title is null or length(channel_title) <= 120),
  thumbnail_url text check (thumbnail_url is null or length(thumbnail_url) <= 500),
  -- [{ videoId, title, position, durationSeconds, thumbnailUrl }]
  videos jsonb not null default '[]'::jsonb check (jsonb_typeof(videos) = 'array'),
  fetched_at timestamptz not null default now()
);

alter table public.youtube_playlist_cache enable row level security;
revoke all on table public.youtube_playlist_cache from anon, authenticated;

-- ── 4) Kanal linkiyle eklenmiş kayıtlar (eski elle-liste akışı) ──────────
update public.student_resource_playlists
   set issue = 'kanal_linki'
 where issue is null
   and youtube_playlist_id is null
   and kind = 'playlist'
   and (teacher_name ~* 'youtube\.com/(@|channel/|c/|user/)' or coalesce(title, '') ~* 'youtube\.com/(@|channel/|c/|user/)');
