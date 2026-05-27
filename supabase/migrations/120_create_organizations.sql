-- ─────────────────────────────────────────────────────────────────────────
-- 120 — Kurum (B2B) modeli
-- ─────────────────────────────────────────────────────────────────────────
-- Soft migration: tüm referanslar nullable. Mevcut bireysel koç/öğrenciler
-- organization_id=null kalır, davranışları değişmez.
-- ─────────────────────────────────────────────────────────────────────────

create table public.organizations (
  id             uuid        primary key default gen_random_uuid(),
  name           text        not null,
  slug           text        unique not null,
  logo_url       text,
  primary_color  text        check (primary_color is null or primary_color ~ '^#[0-9a-fA-F]{6}$'),
  accent_color   text        check (accent_color is null or accent_color ~ '^#[0-9a-fA-F]{6}$'),
  plan           text        not null default 'starter'
                              check (plan in ('starter', 'pro', 'enterprise')),
  contact_email  text,
  contact_phone  text,
  address        text,
  is_active      boolean     not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index on public.organizations (slug);
create index on public.organizations (is_active);

create trigger trg_organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

alter table public.organizations enable row level security;

-- profiles.organization_id — null = bireysel
alter table public.profiles
  add column if not exists organization_id uuid
    references public.organizations(id) on delete set null;

create index if not exists profiles_organization_id_idx
  on public.profiles (organization_id);

-- role enum'ına 'org_admin' ekle
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('student', 'coach', 'admin', 'org_admin'));

-- students.organization_id — null = bireysel koça atanmış / serbest
alter table public.students
  add column if not exists organization_id uuid
    references public.organizations(id) on delete set null;

create index if not exists students_organization_id_idx
  on public.students (organization_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Helper functions: org context
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.current_user_org_id()
returns uuid language sql security definer stable
set search_path = public as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_org_admin_of(target_org_id uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'org_admin'
      and organization_id = target_org_id
  )
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- RLS: organizations
-- ─────────────────────────────────────────────────────────────────────────
-- Platform admin her şeyi yönetir
create policy "organizations_admin_all" on public.organizations
  for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Org admin sadece kendi kurumunu okur ve günceller
create policy "organizations_org_admin_select" on public.organizations
  for select using (public.is_org_admin_of(id));

create policy "organizations_org_admin_update" on public.organizations
  for update using (public.is_org_admin_of(id))
  with check (public.is_org_admin_of(id));

-- Kurum üyeleri (koç + öğrenci) kurumlarını okuyabilir (branding için)
create policy "organizations_member_select" on public.organizations
  for select using (id = public.current_user_org_id());

-- ─────────────────────────────────────────────────────────────────────────
-- RLS: org_admin için ek policy'ler — diğer tablolara erişim
-- ─────────────────────────────────────────────────────────────────────────
-- profiles: org_admin kendi kurumunun tüm profillerini görür
create policy "profiles_org_admin_select" on public.profiles
  for select using (
    organization_id is not null
    and public.is_org_admin_of(organization_id)
  );

-- profiles: org_admin kendi kurumundaki üyelerin profilini günceller
create policy "profiles_org_admin_update" on public.profiles
  for update using (
    organization_id is not null
    and public.is_org_admin_of(organization_id)
  );

-- students: org_admin kurumun tüm öğrencilerini yönetebilir
create policy "students_org_admin_all" on public.students
  for all
  using (
    organization_id is not null
    and public.is_org_admin_of(organization_id)
  )
  with check (
    organization_id is not null
    and public.is_org_admin_of(organization_id)
  );

-- topic_assignments: org_admin kurum içi tüm atamaları okur
create policy "topic_assignments_org_admin_select" on public.topic_assignments
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = topic_assignments.coach_id
        and p.organization_id is not null
        and public.is_org_admin_of(p.organization_id)
    )
  );

-- appointments: org_admin kurum koçlarının randevularını okur
create policy "appointments_org_admin_select" on public.appointments
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = appointments.coach_id
        and p.organization_id is not null
        and public.is_org_admin_of(p.organization_id)
    )
  );

-- study_sessions: org_admin kurum öğrencilerinin oturumlarını görür
create policy "study_sessions_org_admin_select" on public.study_sessions
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = study_sessions.student_id
        and p.organization_id is not null
        and public.is_org_admin_of(p.organization_id)
    )
  );

-- exams: aynı pattern
create policy "exams_org_admin_select" on public.exams
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = exams.student_id
        and p.organization_id is not null
        and public.is_org_admin_of(p.organization_id)
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- Helper: kurum içi koç davet
-- ─────────────────────────────────────────────────────────────────────────
-- handle_new_user trigger (mevcut) organization_id'yi raw_user_meta_data'dan
-- alacak şekilde güncellenir.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  v_role text := new.raw_user_meta_data->>'role';
  v_org_id uuid;
begin
  if v_role is null then
    return new;
  end if;

  begin
    v_org_id := nullif(new.raw_user_meta_data->>'organization_id', '')::uuid;
  exception when others then
    v_org_id := null;
  end;

  insert into public.profiles (id, role, full_name, email, phone, organization_id)
  values (
    new.id,
    v_role,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    new.raw_user_meta_data->>'phone',
    v_org_id
  );

  return new;
end; $$;
