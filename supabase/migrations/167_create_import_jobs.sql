-- ─────────────────────────────────────────────────────────────────────────
-- TOPLU ÖĞRENCİ IMPORT — durum-takipli iş + satır tablosu
-- Client-driven: tarayıcı chunk'ları throttle'lı işler; sayfa kapanırsa
-- iş kalıcı kalır, tekrar açınca devam eder. Yazma service-role ile yapılır.
-- ─────────────────────────────────────────────────────────────────────────
create table public.import_jobs (
  id              uuid primary key default gen_random_uuid(),
  created_by      uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  filename        text,
  total           int not null default 0,
  processed       int not null default 0,
  succeeded       int not null default 0,
  failed          int not null default 0,
  status          text not null default 'pending'
                    check (status in ('pending', 'processing', 'completed', 'paused')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.import_rows (
  id                 uuid primary key default gen_random_uuid(),
  job_id             uuid not null references public.import_jobs(id) on delete cascade,
  row_index          int not null,
  data               jsonb not null,
  status             text not null default 'pending'
                       check (status in ('pending', 'success', 'error')),
  error_message      text,
  created_student_id uuid,
  created_at         timestamptz not null default now()
);

alter table public.import_jobs enable row level security;
alter table public.import_rows enable row level security;

create index on public.import_jobs (created_by, created_at desc);
create index on public.import_rows (job_id, status);

-- SELECT: işi oluşturan + admin + işin kurumunun org_admin'i
-- (yazma işlemleri service-role ile yapılır → insert/update policy gerekmez)
create policy "import_jobs_select" on public.import_jobs
  for select using (
    created_by = auth.uid()
    or public.current_user_role() = 'admin'
    or public.is_org_admin_of(organization_id)
  );

create policy "import_rows_select" on public.import_rows
  for select using (
    exists (
      select 1 from public.import_jobs j
      where j.id = import_rows.job_id
        and (
          j.created_by = auth.uid()
          or public.current_user_role() = 'admin'
          or public.is_org_admin_of(j.organization_id)
        )
    )
  );
