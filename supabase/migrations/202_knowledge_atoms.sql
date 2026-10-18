-- ─────────────────────────────────────────────────────────────────────────
-- 202 — Bilgi atomları (knowledge_atoms) + ön koşul ilişkisi
-- ─────────────────────────────────────────────────────────────────────────
-- Konu (topics) altındaki en küçük öğrenme birimi: formül, kural, kavram, yöntem.
-- Yanlış defteri (203) yanlışları atoma bağlar; açık haritası (205) atom
-- bazında zayıflık skoru hesaplar.
--
-- GLOBAL katalog (topics ile aynı model): org_id yok, herkes okur, yazma
-- yalnızca service role (scripts/import-knowledge-atoms.mjs). id DIŞARIDAN
-- gelir (seed JSON) → default yok; import upsert-by-id ile idempotent.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.knowledge_atoms (
  id               uuid primary key,
  topic_id         uuid not null references public.topics(id) on delete cascade,
  name             text not null,
  type             text not null,
  description      text,            -- LaTeX içerebilir
  meb_kazanim_kodu text,
  sort_order       integer not null default 0,
  source_url       text,
  created_at       timestamptz not null default now(),
  constraint knowledge_atoms_type_check check (type in ('formul', 'kural', 'kavram', 'yontem')),
  constraint knowledge_atoms_name_check check (length(trim(name)) > 0),
  constraint knowledge_atoms_topic_name_key unique (topic_id, name)
);

create index if not exists knowledge_atoms_topic_id_idx on public.knowledge_atoms (topic_id, sort_order);

create table if not exists public.knowledge_atom_prerequisites (
  atom_id              uuid not null references public.knowledge_atoms(id) on delete cascade,
  prerequisite_atom_id uuid not null references public.knowledge_atoms(id) on delete cascade,
  primary key (atom_id, prerequisite_atom_id),
  constraint knowledge_atom_prerequisites_not_self check (atom_id <> prerequisite_atom_id)
);

create index if not exists knowledge_atom_prerequisites_prereq_idx
  on public.knowledge_atom_prerequisites (prerequisite_atom_id);

alter table public.knowledge_atoms enable row level security;
alter table public.knowledge_atom_prerequisites enable row level security;

drop policy if exists "knowledge_atoms_read_all" on public.knowledge_atoms;
create policy "knowledge_atoms_read_all" on public.knowledge_atoms
  for select using (true);

drop policy if exists "knowledge_atom_prerequisites_read_all" on public.knowledge_atom_prerequisites;
create policy "knowledge_atom_prerequisites_read_all" on public.knowledge_atom_prerequisites
  for select using (true);
-- INSERT/UPDATE/DELETE policy'si YOK → yalnızca service role yazar.
