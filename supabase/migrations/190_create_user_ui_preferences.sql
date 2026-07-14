-- ─────────────────────────────────────────────────────────────────────────
-- 190 — user_ui_preferences: kullanıcı bazlı, kalıcı UI tercihleri
-- ─────────────────────────────────────────────────────────────────────────
-- scope örn: 'mudur_dashboard', 'mudur_student_list', 'koc_student_list'.
-- settings jsonb: kolon görünürlüğü, sıralama metriği, çarpan aç/kapa vb.
-- RLS: kullanıcı SADECE kendi satırını görür/yazar.
--
-- ROLLBACK:
--   drop table if exists public.user_ui_preferences;
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.user_ui_preferences (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  scope      text        not null,
  settings   jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, scope)
);

alter table public.user_ui_preferences enable row level security;

-- Kullanıcı yalnız kendi tercihlerini okur
create policy "uiprefs_select_own" on public.user_ui_preferences
  for select using (user_id = auth.uid());

-- Kullanıcı yalnız kendi adına ekler
create policy "uiprefs_insert_own" on public.user_ui_preferences
  for insert with check (user_id = auth.uid());

-- Kullanıcı yalnız kendi satırını günceller
create policy "uiprefs_update_own" on public.user_ui_preferences
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Kullanıcı yalnız kendi satırını siler (tercihleri sıfırlama)
create policy "uiprefs_delete_own" on public.user_ui_preferences
  for delete using (user_id = auth.uid());

create trigger trg_user_ui_preferences_updated_at
  before update on public.user_ui_preferences
  for each row execute function public.set_updated_at();
