-- ─────────────────────────────────────────────────────────────────────────
-- RESOURCES — kaynak (kitap/yayın) kataloğu
-- org_id null → ortak/herkese açık katalog; dolu → o kuruma özel.
-- Yazma yok (RLS) → katalog yönetimi server action + service-role ile yapılır
-- (subjects "select using(true), yazma yok" deseniyle tutarlı).
-- ─────────────────────────────────────────────────────────────────────────
do $$ begin
  create type resource_type as enum ('soru_bankasi', 'konu_anlatimi', 'deneme', 'foy');
exception when duplicate_object then null; end $$;

create table public.resources (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  publisher       text,
  subject_id      uuid references public.subjects(id),
  type            resource_type not null default 'soru_bankasi',
  total_questions int check (total_questions is null or total_questions >= 0),
  org_id          uuid references public.organizations(id) on delete set null,
  is_custom       boolean not null default false,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz default now()
);

alter table public.resources enable row level security;

create index on public.resources (subject_id);
create index on public.resources (org_id);

-- SELECT: ortak katalog (org_id null) + kendi kurumu + admin
create policy "resources_select" on public.resources
  for select using (
    org_id is null
    or org_id = public.current_user_org_id()
    or public.current_user_role() = 'admin'
  );
