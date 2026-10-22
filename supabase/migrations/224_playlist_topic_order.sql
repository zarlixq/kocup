-- Playlist konu sırası: aktif planı olan playlist, kapsadığı (videolarının
-- eşlendiği) konularda yol haritası ve haftalık programın konu sırasını belirler.
-- Varsayılan açık; öğrenci plan ayarlarından kapatabilir. Yalnız ekleme (DROP yok).

alter table public.student_resource_playlists
  add column if not exists order_topics boolean not null default true;

comment on column public.student_resource_playlists.order_topics is
  'Aktif plan varken kapsadığı konularda UpPlan konu sırasını bu playlist belirler.';
