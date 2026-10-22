-- Video konu eşleştirmesi: düşük güvenli öneri + öğrenci düzeltmelerinden
-- global öneri. Yalnız ekleme (DROP yok).
--
-- 1) student_resource_videos.suggested_topic_id: güveni düşük otomatik eşleşme
--    videoyu konuya BAĞLAMAZ (topic_id null, match_status 'eslesmedi'); öneri
--    burada "onay bekliyor" olarak durur, öğrenci Kaynaklarım'da toplu onaylar.
-- 2) youtube_video_topic_corrections: öğrencinin elle yaptığı eşleştirme
--    (playlist + video + öğrenci başına son karar; topic_id null = "konusuz").
--    Aynı playlist'i ekleyen sonraki öğrenciye çoğunluk kararı önerilir.
--    Yalnız sunucu (service role) okur/yazar; RLS açık, politika yok.

alter table public.student_resource_videos
  add column if not exists suggested_topic_id uuid references public.topics(id) on delete set null;

create table if not exists public.youtube_video_topic_corrections (
  youtube_playlist_id text not null check (youtube_playlist_id ~ '^[A-Za-z0-9_-]{10,64}$'),
  youtube_video_id text not null check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  student_id uuid not null references public.profiles(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (youtube_playlist_id, youtube_video_id, student_id)
);

create index if not exists youtube_video_topic_corrections_playlist_idx
  on public.youtube_video_topic_corrections (youtube_playlist_id);

alter table public.youtube_video_topic_corrections enable row level security;
revoke all on table public.youtube_video_topic_corrections from anon, authenticated;
