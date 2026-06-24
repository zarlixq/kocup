-- ─────────────────────────────────────────────────────────────────────────
-- CATCH-UP: page_views (ziyaret/analitik) tablosu. Idempotent.
-- /api/track route handler buraya yazar; müdür ziyaretler paneli okur.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.page_views (
  id               uuid primary key default gen_random_uuid(),
  event_type       text not null default 'page_view',
  path             text not null,
  tool_slug        text,
  referrer         text,
  session_id       text,
  is_authenticated boolean not null default false,
  created_at       timestamptz not null default now()
);

alter table public.page_views enable row level security;

create index if not exists page_views_created_at_idx on public.page_views (created_at);
create index if not exists page_views_path_idx on public.page_views (path);
create index if not exists page_views_tool_slug_idx on public.page_views (tool_slug);

-- Anonim + authenticated INSERT serbest (tracking); SELECT sadece admin/org_admin
drop policy if exists "page_views_insert_any" on public.page_views;
create policy "page_views_insert_any" on public.page_views
  for insert to anon, authenticated with check (true);

drop policy if exists "page_views_admin_select" on public.page_views;
create policy "page_views_admin_select" on public.page_views
  for select to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = any (array['admin', 'org_admin'])
    )
  );
