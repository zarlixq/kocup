-- ─────────────────────────────────────────────────────────────────────────
-- 221 — Kaynaklarım video takip modülü
-- ─────────────────────────────────────────────────────────────────────────
-- 1) student_resource_playlists
--      kind   : playlist (YouTube playlist / elle liste) · tekli (ders bazlı
--               "Tekli videolar" sanal grubu; öğrenci+ders başına bir satır)
--      status : aktif · duraklatildi · tamamlandi (öğrenci seçer)
--      thumbnail_url, last_synced_at (YouTube cache; "Yenile" günceller)
--      Aynı YouTube playlist'i bir öğrencide bir kez.
-- 2) student_resource_videos: duration_seconds, thumbnail_url, note.
--      watched_at / position mevcut (216). Mevcut satırlar korunur.
-- 3) Koç okuması aynı kurum içinde: is_coach_of + öğrenci/koç organization_id
--    eşleşmesi (ikisi de null → bireysel koç). ALTER POLICY ile.
-- ─────────────────────────────────────────────────────────────────────────

-- ── 1) Playlist ──────────────────────────────────────────────────────────
alter table public.student_resource_playlists add column if not exists kind text not null default 'playlist';
alter table public.student_resource_playlists add column if not exists status text not null default 'aktif';
alter table public.student_resource_playlists add column if not exists thumbnail_url text;
alter table public.student_resource_playlists add column if not exists last_synced_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'student_resource_playlists_kind_check') then
    alter table public.student_resource_playlists
      add constraint student_resource_playlists_kind_check check (kind in ('playlist', 'tekli'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'student_resource_playlists_status_check') then
    alter table public.student_resource_playlists
      add constraint student_resource_playlists_status_check check (status in ('aktif', 'duraklatildi', 'tamamlandi'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'student_resource_playlists_thumb_check') then
    alter table public.student_resource_playlists
      add constraint student_resource_playlists_thumb_check check (thumbnail_url is null or length(thumbnail_url) <= 500);
  end if;
end;
$$;

create unique index if not exists student_resource_playlists_tekli_key
  on public.student_resource_playlists (student_id, subject_id) where kind = 'tekli';
create unique index if not exists student_resource_playlists_yt_key
  on public.student_resource_playlists (student_id, youtube_playlist_id) where youtube_playlist_id is not null;

-- ── 2) Video ─────────────────────────────────────────────────────────────
alter table public.student_resource_videos add column if not exists duration_seconds integer;
alter table public.student_resource_videos add column if not exists thumbnail_url text;
alter table public.student_resource_videos add column if not exists note text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'student_resource_videos_duration_check') then
    alter table public.student_resource_videos
      add constraint student_resource_videos_duration_check check (duration_seconds is null or duration_seconds between 0 and 86400);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'student_resource_videos_thumb_check') then
    alter table public.student_resource_videos
      add constraint student_resource_videos_thumb_check check (thumbnail_url is null or length(thumbnail_url) <= 500);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'student_resource_videos_note_check') then
    alter table public.student_resource_videos
      add constraint student_resource_videos_note_check check (note is null or length(note) <= 500);
  end if;
end;
$$;

-- Günlük izleme özeti / haftalık grafik.
create index if not exists student_resource_videos_student_watched_idx
  on public.student_resource_videos (student_id, watched_at) where watched_at is not null;
create index if not exists student_resource_videos_student_video_idx
  on public.student_resource_videos (student_id, youtube_video_id);

-- Mevcut videolara YouTube'un sabit küçük resmi (anahtar gerektirmez).
update public.student_resource_videos
   set thumbnail_url = 'https://i.ytimg.com/vi/' || youtube_video_id || '/mqdefault.jpg'
 where thumbnail_url is null;

-- ── 3) Koç: yalnız kendi öğrencisi, aynı kurum ───────────────────────────
create or replace function public.is_coach_of_same_org(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.students s
      join public.profiles cp on cp.id = auth.uid()
     where s.id = p_student_id
       and s.coach_id = auth.uid()
       and s.organization_id is not distinct from cp.organization_id
  )
$$;

revoke all on function public.is_coach_of_same_org(uuid) from public, anon;
grant execute on function public.is_coach_of_same_org(uuid) to authenticated;

alter policy student_resource_playlists_select on public.student_resource_playlists
  using (
    student_id = auth.uid()
    or public.is_coach_of_same_org(student_id)
    or public.current_user_role() = 'admin'
    or exists (select 1 from public.profiles p
                where p.id = student_resource_playlists.student_id and p.organization_id is not null
                  and public.is_org_admin_of(p.organization_id))
  );

alter policy student_resource_videos_select on public.student_resource_videos
  using (
    student_id = auth.uid()
    or public.is_coach_of_same_org(student_id)
    or public.current_user_role() = 'admin'
    or exists (select 1 from public.profiles p
                where p.id = student_resource_videos.student_id and p.organization_id is not null
                  and public.is_org_admin_of(p.organization_id))
  );
