-- subjects tablosu: global YKS ders listesi (TYT + AYT)
create table public.subjects (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null unique,
  color      text        not null,
  "order"    integer     not null,
  exam_type  text        not null check (exam_type in ('TYT', 'AYT')),
  created_at timestamptz default now()
);

alter table public.subjects enable row level security;
create policy "subjects_read_all" on public.subjects for select using (true);

create index on public.subjects (exam_type);
create index on public.subjects ("order");

-- TYT Dersleri
insert into public.subjects (name, color, "order", exam_type) values
  ('TYT Türkçe',      '#EF4444', 1,  'TYT'),
  ('TYT Matematik',   '#3B82F6', 2,  'TYT'),
  ('TYT Geometri',    '#8B5CF6', 3,  'TYT'),
  ('TYT Fizik',       '#F59E0B', 4,  'TYT'),
  ('TYT Kimya',       '#10B981', 5,  'TYT'),
  ('TYT Biyoloji',    '#22C55E', 6,  'TYT'),
  ('TYT Tarih',       '#A855F7', 7,  'TYT'),
  ('TYT Coğrafya',    '#06B6D4', 8,  'TYT'),
  ('TYT Felsefe',     '#EC4899', 9,  'TYT'),
  ('TYT Din Kültürü', '#64748B', 10, 'TYT');

-- AYT Dersleri
insert into public.subjects (name, color, "order", exam_type) values
  ('AYT Matematik', '#3B82F6', 11, 'AYT'),
  ('AYT Geometri',  '#8B5CF6', 12, 'AYT'),
  ('AYT Fizik',     '#F59E0B', 13, 'AYT'),
  ('AYT Kimya',     '#10B981', 14, 'AYT'),
  ('AYT Biyoloji',  '#22C55E', 15, 'AYT'),
  ('AYT Edebiyat',  '#EF4444', 16, 'AYT'),
  ('AYT Tarih',     '#A855F7', 17, 'AYT'),
  ('AYT Coğrafya',  '#06B6D4', 18, 'AYT'),
  ('AYT Felsefe',   '#EC4899', 19, 'AYT');
